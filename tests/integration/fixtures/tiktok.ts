import { randomUUID } from 'node:crypto';
import { vi } from 'vitest';
import request from 'supertest';
import { TikTokClient } from '../../../backend/src/integrations/tiktok/client.js';
import { TikTokAccountTokens } from '../../../backend/src/integrations/tiktok/account-tokens.js';
import { TokenVault } from '../../../backend/src/integrations/instagram/token-crypto.js';
import { saveTikTokAccount } from '../../../backend/src/integrations/tiktok/accounts.js';
import { createApp } from '../../../backend/src/app.js';
import { createAuthentication } from '../../../backend/src/services/auth.service.js';
import { createWorkspaceFixture } from './workspace.js';
import { testKey, testOrigin, testSecret } from './instagram.js';

const fixtureOptions = {
  clientKey: 'fixture-client',
  clientSecret: 'fixture-client-secret',
  redirectUri: 'https://test.example/api/auth/tiktok/callback',
};

export function tiktokFixture() {
  const state = {
    openId: randomUUID(),
    scopes: true,
    revoked: false,
    refreshCalls: 0,
    publishCalls: 0,
    refreshToken: 'refresh-secret',
    refreshTimeout: false,
    publishTimeout: false,
    reject: false,
    creatorBlocked: false,
    scopeRevoked: false,
    status: 'PROCESSING_DOWNLOAD',
    privacy: ['SELF_ONLY', 'FOLLOWER_OF_CREATOR', 'MUTUAL_FOLLOW_FRIENDS'],
    commentDisabled: false,
    maxDuration: 300,
    mismatch: false,
  };
  const token = () => fixtureToken(state);
  const ok = (data: unknown) => Response.json({ data, error: { code: 'ok' } });
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === '/v2/oauth/token/') {
      const body = new URLSearchParams(String(init?.body));
      if (body.get('grant_type') === 'refresh_token') {
        if (body.get('refresh_token') !== state.refreshToken)
          return Response.json({ error: 'invalid_grant' }, { status: 400 });
        state.refreshCalls++;
        state.refreshToken = `rotated-refresh-${state.refreshCalls}`;
        if (state.refreshTimeout) throw new Error('private response lost');
      }
      return Response.json(token());
    }
    if (state.revoked)
      return Response.json(
        { error: { code: 'access_token_invalid', message: 'private-secret' } },
        { status: 401 },
      );
    if (url.pathname === '/v2/user/info/')
      return ok({
        user: {
          open_id: state.mismatch ? 'foreign' : state.openId,
          display_name: 'TikTok creator',
        },
      });
    if (url.pathname.endsWith('/creator_info/query/')) {
      if (state.scopeRevoked)
        return Response.json({ error: { code: 'scope_not_authorized' } }, { status: 401 });
      if (state.creatorBlocked)
        return Response.json({ error: { code: 'spam_risk_too_many_posts' } });
      return ok({
        creator_username: 'fixture_creator',
        creator_nickname: 'TikTok creator',
        privacy_level_options: state.privacy,
        comment_disabled: state.commentDisabled,
        duet_disabled: false,
        stitch_disabled: true,
        max_video_post_duration_sec: state.maxDuration,
      });
    }
    if (url.pathname.endsWith('/init/')) {
      state.publishCalls++;
      if (state.publishTimeout) throw new Error('private response lost');
      if (state.reject)
        return Response.json({ error: { code: 'url_ownership_unverified' } }, { status: 403 });
      return ok({ publish_id: 'publish-1' });
    }
    return ok({
      status: state.status,
      publicaly_available_post_id: [],
    });
  });
  const client = new TikTokClient(fixtureOptions, fetcher);
  return { client, state, fetcher };
}

export async function createTikTokWorkspaceFixture() {
  const original = await createWorkspaceFixture({ accountId: randomUUID() });
  const provider = tiktokFixture(),
    vault = new TokenVault(testKey, 'tiktok');
  const tiktok = {
    ...provider,
    vault,
    tokens: new TikTokAccountTokens(original.db, provider.client, vault),
    audited: false,
    mediaOrigin: 'https://api.test.example',
    signingKey: testKey,
  };
  const common = {
    database: original.db,
    secret: testSecret,
    webOrigin: testOrigin,
    production: false,
  };
  const auth = createAuthentication({
    ...common,
    tiktok: { ...common, client: tiktok.client, vault },
  });
  const app = createApp({
    webOrigin: testOrigin,
    auth,
    workspace: {
      database: original.db,
      storage: original.storage,
      instagramConfigured: true,
      tokens: original.tokens,
      tiktok,
      uploads: {
        signingKey: testSecret,
        apiOrigin: 'https://api.test.example',
        webOrigin: testOrigin,
      },
    },
    checks: { database: async () => {}, redis: async () => {} },
  });
  const user = await original.db.user.findUniqueOrThrow({ where: { id: original.userId } });
  const agent = request.agent(app);
  const login = await agent
    .post('/api/auth/sign-in/email')
    .set('Origin', testOrigin)
    .send({ email: user.email, password: 'long-enough-passphrase' });
  if (login.status !== 200) throw new Error('TikTok fixture login failed');
  return {
    ...original,
    app,
    agent,
    tiktok,
    connect: async () => {
      await saveTikTokAccount(
        original.db,
        vault,
        await tiktok.client.exchange('code'),
        original.userId,
      );
      return original.db.socialAccount.findFirstOrThrow({
        where: { userId: original.userId, provider: 'TIKTOK' },
      });
    },
  };
}

function fixtureToken(state: {
  openId: string;
  refreshCalls: number;
  refreshToken: string;
  scopes: boolean;
}) {
  return {
    open_id: state.openId,
    access_token: state.refreshCalls ? 'renewed-secret' : 'access-secret',
    refresh_token: state.refreshToken,
    expires_in: 86400,
    refresh_expires_in: 31536000,
    scope: state.scopes ? 'user.info.basic,video.publish' : 'user.info.basic',
    token_type: 'Bearer',
  };
}
