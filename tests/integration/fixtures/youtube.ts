import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { vi } from 'vitest';
import { YouTubeClient } from '../../../backend/src/integrations/youtube/client.js';
import { YouTubeUploads } from '../../../backend/src/integrations/youtube/uploads.js';
import { YouTubeAccountTokens } from '../../../backend/src/integrations/youtube/account-tokens.js';
import { TokenVault } from '../../../backend/src/integrations/instagram/token-crypto.js';
import { YOUTUBE_SCOPES } from '../../../backend/src/integrations/youtube/schemas.js';
import { saveYouTubeAccount } from '../../../backend/src/integrations/youtube/accounts.js';
import { createAuthentication } from '../../../backend/src/services/auth.service.js';
import { createApp } from '../../../backend/src/app.js';
import { createWorkspaceFixture } from './workspace.js';
import { testKey, testSecret, testOrigin } from './instagram.js';

export function youtubeFixture() {
  const state = youtubeFixtureState();
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === 'oauth2.googleapis.com') {
      const params = new URLSearchParams(String(init?.body));
      const refresh = params.get('grant_type') === 'refresh_token';
      if (refresh) {
        state.refreshCalls++;
        if (state.refreshTimeout) throw new Error('private response lost');
      }
      if (state.revoked) return Response.json({ error: 'invalid_grant' }, { status: 400 });
      return Response.json({
        access_token: `access-${state.channelId}`,
        token_type: 'Bearer',
        expires_in: 3600,
        ...(state.offline && !refresh ? { refresh_token: 'fixture-refresh' } : {}),
        ...(!refresh
          ? { scope: state.granted ? YOUTUBE_SCOPES.join(' ') : YOUTUBE_SCOPES[0] }
          : {}),
      });
    }
    if (state.revoked)
      return Response.json({ error: { message: 'private-provider-body' } }, { status: 401 });
    if (url.pathname === '/youtube/v3/channels')
      return Response.json({
        items: [
          {
            id: state.foreign ? 'foreign-channel' : state.channelId,
            snippet: { title: 'YouTube fixture creator' },
          },
        ],
      });
    if (url.pathname === '/youtube/v3/videos')
      return Response.json({
        items: [
          {
            id: 'video-1',
            snippet: { channelId: state.foreign ? 'foreign-channel' : state.channelId },
            status: {
              uploadStatus: state.processing ? 'uploaded' : state.uploadStatus,
              privacyStatus: state.privacy,
            },
          },
        ],
      });
    return uploadResponse(state, url, init);
  });
  return {
    state,
    fetcher,
    client: new YouTubeClient(
      {
        clientId: 'fixture-client',
        clientSecret: 'fixture-only-secret',
        redirectUri: `${testOrigin}/api/auth/youtube/callback`,
      },
      fetcher,
    ),
  };
}

export async function createYouTubeWorkspaceFixture() {
  const original = await createWorkspaceFixture({ accountId: randomUUID() });
  const provider = youtubeFixture();
  const vault = new TokenVault(testKey, 'youtube');
  const youtube = {
    ...provider,
    vault,
    uploads: new YouTubeUploads(provider.fetcher),
    uploadVault: new TokenVault(testKey, 'youtube-upload'),
    tokens: new YouTubeAccountTokens(original.db, provider.client, vault),
  };
  const common = {
    database: original.db,
    secret: testSecret,
    webOrigin: testOrigin,
    production: false,
  };
  const auth = createAuthentication({
    ...common,
    youtube: { ...common, client: youtube.client, vault },
  });
  const app = createApp({
    webOrigin: testOrigin,
    auth,
    workspace: {
      database: original.db,
      storage: original.storage,
      instagramConfigured: false,
      youtube,
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
  if (login.status !== 200) throw new Error('YouTube fixture login failed');
  return {
    ...original,
    app,
    agent,
    youtube,
    connect: async () => {
      await saveYouTubeAccount(
        original.db,
        vault,
        await provider.client.exchange('fixture-code', 'fixture-verifier'),
        original.userId,
      );
      return original.db.socialAccount.findFirstOrThrow({
        where: { userId: original.userId, provider: 'YOUTUBE' },
      });
    },
  };
}

function youtubeFixtureState() {
  return {
    channelId: `UC-${randomUUID()}`,
    granted: true,
    offline: true,
    revoked: false,
    foreign: false,
    refreshCalls: 0,
    refreshTimeout: false,
    initCalls: 0,
    sendCalls: 0,
    probes: 0,
    initTimeout: false,
    quotaExceeded: false,
    sendTimeout: false,
    partial: 0,
    completed: false,
    processing: false,
    expiredSession: false,
    evilLocation: false,
    privacy: 'private',
    title: '',
    requestedPrivacy: '',
    uploadStatus: 'processed',
  };
}

function uploadResponse(
  state: ReturnType<typeof youtubeFixtureState>,
  url: URL,
  init: RequestInit | undefined,
) {
  if (url.pathname === '/upload/youtube/v3/videos' && init?.method === 'POST') {
    state.initCalls++;
    if (state.quotaExceeded)
      return Response.json({ error: { errors: [{ reason: 'quotaExceeded' }] } }, { status: 403 });
    const data = JSON.parse(String(init.body)) as {
      snippet: { title: string };
      status: { privacyStatus: string };
    };
    state.title = data.snippet.title;
    state.requestedPrivacy = data.status.privacyStatus;
    if (state.initTimeout) throw new Error('private init response lost');
    return new Response(null, {
      status: 200,
      headers: {
        location: state.evilLocation
          ? 'https://evil.example/steal'
          : 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=fixture-capability',
      },
    });
  }
  if (url.pathname === '/upload/youtube/v3/videos' && init?.method === 'PUT') {
    if (state.expiredSession) return Response.json({ error: {} }, { status: 404 });
    const range = new Headers(init.headers).get('Content-Range');
    if (range?.startsWith('bytes */')) {
      state.probes++;
      return state.completed
        ? Response.json({ id: 'video-1' })
        : new Response(null, {
            status: 308,
            headers: state.partial ? { range: `bytes=0-${state.partial - 1}` } : {},
          });
    }
    state.sendCalls++;
    state.completed = true;
    if (state.sendTimeout) throw new Error('private send response lost');
    return Response.json({ id: 'video-1' }, { status: 201 });
  }
  throw new Error('Unexpected fixture request');
}
