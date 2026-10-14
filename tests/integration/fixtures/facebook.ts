import { vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { FacebookClient } from '../../../backend/src/integrations/facebook/client.js';
import { FACEBOOK_SCOPES } from '../../../backend/src/integrations/facebook/schemas.js';
import { FacebookAccountTokens } from '../../../backend/src/integrations/facebook/account-tokens.js';
import { TokenVault } from '../../../backend/src/integrations/instagram/token-crypto.js';
import { createApp } from '../../../backend/src/app.js';
import { createAuthentication } from '../../../backend/src/services/auth.service.js';
import { createWorkspaceFixture } from './workspace.js';
import { testKey, testOrigin, testSecret } from './instagram.js';

export function facebookFixture() {
  const state = {
    pages: [
      { id: '778899', name: 'Test Page', access_token: 'page-secret', tasks: ['CREATE_CONTENT'] },
    ],
    denied: false,
    revoked: false,
    expiresAt: 0,
    dataExpiresAt: 0,
    publishTimeout: false,
    publishRejected: false,
    videoReadDenied: false,
    videoReady: false,
    videoPublished: false,
    photoCalls: 0,
    videoCalls: 0,
  };
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/oauth/access_token'))
      return Response.json({ access_token: 'user-secret', expires_in: 5184000 });
    if (url.pathname.endsWith('/debug_token')) {
      const user = url.searchParams.get('input_token') === 'user-secret';
      const page = state.pages.find((p) => p.access_token === url.searchParams.get('input_token'));
      return Response.json({
        data: {
          app_id: '123',
          is_valid: !state.revoked,
          type: user ? 'USER' : 'PAGE',
          ...(user ? { user_id: '444555' } : { profile_id: page?.id ?? '778899' }),
          expires_at: state.expiresAt,
          data_access_expires_at: state.dataExpiresAt,
          scopes: state.denied ? ['pages_show_list'] : FACEBOOK_SCOPES,
        },
      });
    }
    if (url.pathname.endsWith('/me/accounts')) return Response.json({ data: state.pages });
    if (url.pathname.endsWith('/me')) {
      const token = new Headers(init?.headers).get('Authorization')?.replace('Bearer ', '');
      const page = state.pages.find((p) => p.access_token === token);
      return Response.json({ id: page?.id ?? '778899', name: page?.name ?? 'Test Page' });
    }
    if (init?.method === 'POST') {
      const video = url.pathname.endsWith('/videos');
      if (video) state.videoCalls++;
      else state.photoCalls++;
      if (state.publishTimeout) throw new Error('private simulated lost response');
      if (state.publishRejected)
        return Response.json({ error: { code: 100, message: 'private-data' } }, { status: 400 });
      return Response.json(video ? { id: '990011' } : { id: '112233', post_id: '778899_112233' });
    }
    if (state.videoReadDenied) return Response.json({ error: { code: 200 } }, { status: 403 });
    return Response.json({
      id: '990011',
      published: state.videoPublished,
      status: { video_status: state.videoReady ? 'ready' : 'processing' },
    });
  });
  const client = new FacebookClient(
    {
      appId: '123',
      appSecret: 'fixture-app-secret',
      redirectUri: 'https://test.example/api/auth/facebook/callback',
      version: 'v26.0',
    },
    fetcher,
  );
  return { state, fetcher, client };
}

export async function createFacebookWorkspaceFixture() {
  const original = await createWorkspaceFixture({ accountId: randomUUID() });
  const facebook = facebookFixture();
  const vault = new TokenVault(testKey, 'facebook');
  const tokens = new FacebookAccountTokens(original.db, facebook.client, vault);
  const options = {
    database: original.db,
    secret: testSecret,
    webOrigin: testOrigin,
    production: false,
  };
  const auth = createAuthentication({
    ...options,
    facebook: { ...options, client: facebook.client, vault },
  });
  const app = createApp({
    webOrigin: testOrigin,
    auth,
    workspace: {
      database: original.db,
      storage: original.storage,
      instagramConfigured: true,
      facebookConfigured: true,
      tokens: original.tokens,
      facebookTokens: tokens,
      uploads: {
        signingKey: testSecret,
        apiOrigin: 'https://api.test.example',
        webOrigin: testOrigin,
      },
    },
    checks: { database: async () => {}, redis: async () => {} },
  });
  const agent = request.agent(app);
  const user = await original.db.user.findUniqueOrThrow({ where: { id: original.userId } });
  const login = await agent
    .post('/api/auth/sign-in/email')
    .set('Origin', testOrigin)
    .send({ email: user.email, password: 'long-enough-passphrase' });
  if (login.status !== 200) throw new Error(`Fixture login failed: ${login.status}`);
  return { ...original, app, agent, facebook: { ...facebook, vault, tokens } };
}
