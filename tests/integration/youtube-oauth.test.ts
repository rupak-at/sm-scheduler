import request from 'supertest';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { createYouTubeWorkspaceFixture } from './fixtures/youtube.js';
import { testOrigin } from './fixtures/instagram.js';
import { saveYouTubeAccount } from '../../backend/src/integrations/youtube/accounts.js';

let fixture: Awaited<ReturnType<typeof createYouTubeWorkspaceFixture>>;
let challenge: string;
beforeAll(async () => {
  fixture = await createYouTubeWorkspaceFixture();
});
beforeEach(async () => {
  await fixture.db.rateLimit.deleteMany();
});
afterAll(async () => {
  await fixture?.db.oAuthAttempt.deleteMany({ where: { userId: fixture.userId } });
  await fixture?.close();
});
async function start() {
  const result = await fixture.agent
    .post('/api/auth/youtube/start')
    .set('Origin', testOrigin)
    .send({});
  expect(result.status).toBe(200);
  const url = new URL(result.body.url);
  challenge = url.searchParams.get('code_challenge')!;
  return url.searchParams.get('state')!;
}
const callback = (state: string) => `/api/auth/youtube/callback?state=${state}&code=fixture-code`;

it('requires an existing session and trusted origin before creating a YouTube connection', async () => {
  expect(
    (await request(fixture.app).post('/api/auth/youtube/start').set('Origin', testOrigin).send({}))
      .status,
  ).toBe(401);
  expect(
    (
      await fixture.agent
        .post('/api/auth/youtube/start')
        .set('Origin', 'https://evil.example')
        .send({})
    ).status,
  ).toBe(403);
  expect(fixture.youtube.state.initCalls).toBe(0);
});
it('binds state to the browser/session, consumes it once, and keeps credentials outside auth accounts', async () => {
  const state = await start();
  expect((await request(fixture.app).get(callback(state))).headers.location).toContain(
    'YOUTUBE_INVALID_OAUTH_STATE',
  );
  const result = await fixture.agent.get(callback(state));
  expect(result.headers.location).toContain('YOUTUBE_connected');
  const exchange = fixture.youtube.fetcher.mock.calls.find(([url]) =>
    String(url).includes('oauth2.googleapis.com/token'),
  );
  const verifier = new URLSearchParams(String(exchange?.[1]?.body)).get('code_verifier')!;
  expect(createHash('sha256').update(verifier).digest('base64url')).toBe(challenge);
  expect((await fixture.agent.get(callback(state))).headers.location).toContain(
    'YOUTUBE_INVALID_OAUTH_STATE',
  );
  const account = await fixture.db.socialAccount.findFirstOrThrow({
    where: { userId: fixture.userId, provider: 'YOUTUBE' },
  });
  expect(account.scopes).toHaveLength(2);
  expect(fixture.youtube.vault.open(account.tokenCiphertext!, account.providerAccountId)).toContain(
    'fixture-refresh',
  );
  expect(
    await fixture.db.account.count({ where: { userId: fixture.userId, providerId: 'youtube' } }),
  ).toBe(0);
  expect((await fixture.agent.get('/api/auth/get-session')).body.user.id).toBe(fixture.userId);
});
it('rejects expired, cross-mode, denied and changed-session callbacks', async () => {
  let state = await start();
  await fixture.db.oAuthAttempt.updateMany({ data: { expiresAt: new Date(0) } });
  expect((await fixture.agent.get(callback(state))).headers.location).toContain(
    'YOUTUBE_INVALID_OAUTH_STATE',
  );
  state = await start();
  await fixture.db.oAuthAttempt.updateMany({ data: { mode: 'tiktok-connect' } });
  expect((await fixture.agent.get(callback(state))).headers.location).toContain(
    'YOUTUBE_INVALID_OAUTH_STATE',
  );
  state = await start();
  expect(
    (await fixture.agent.get(`/api/auth/youtube/callback?state=${state}&error=access_denied`))
      .headers.location,
  ).toContain('YOUTUBE_AUTHORIZATION_DECLINED');
  state = await start();
  await fixture.db.oAuthAttempt.updateMany({ data: { sessionId: null } });
  expect((await fixture.agent.get(callback(state))).headers.location).toContain(
    'YOUTUBE_SESSION_CHANGED',
  );
});
it('cannot transfer a channel across users during simultaneous account saves', async () => {
  const other = await createYouTubeWorkspaceFixture();
  try {
    const authorization = await fixture.youtube.client.exchange('code', 'verifier');
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        saveYouTubeAccount(fixture.db, fixture.youtube.vault, authorization, other.userId),
      ),
    );
    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(
      (
        await fixture.db.socialAccount.findFirstOrThrow({
          where: { provider: 'YOUTUBE', providerAccountId: authorization.channel.id },
        })
      ).userId,
    ).toBe(fixture.userId);
  } finally {
    await other.close();
  }
});
