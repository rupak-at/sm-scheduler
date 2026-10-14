import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTikTokWorkspaceFixture } from './fixtures/tiktok.js';
import { testOrigin } from './fixtures/instagram.js';
let fixture: Awaited<ReturnType<typeof createTikTokWorkspaceFixture>>;
beforeEach(async () => {
  fixture = await createTikTokWorkspaceFixture();
});
afterEach(async () => {
  await fixture.db.oAuthAttempt.deleteMany();
  await fixture.close();
});
async function start() {
  const result = await fixture.agent
    .post('/api/auth/tiktok/start')
    .set('Origin', testOrigin)
    .send({});
  expect(result.status).toBe(200);
  return new URL(result.body.url).searchParams.get('state')!;
}
const callback = (state: string) => `/api/auth/tiktok/callback?state=${state}&code=code`;

describe('TikTok connection state and session security', () => {
  it('requires login, origin, original browser and one-use state while storing both tokens encrypted', async () => {
    expect(
      (await request(fixture.app).post('/api/auth/tiktok/start').set('Origin', testOrigin).send({}))
        .status,
    ).toBe(401);
    expect(
      (
        await fixture.agent
          .post('/api/auth/tiktok/start')
          .set('Origin', 'https://evil.example')
          .send({})
      ).status,
    ).toBe(403);
    const state = await start();
    expect((await request(fixture.app).get(callback(state))).headers.location).toContain(
      'TIKTOK_INVALID_OAUTH_STATE',
    );
    expect(fixture.tiktok.fetcher).not.toHaveBeenCalled();
    expect((await fixture.agent.get(callback(state))).headers.location).toContain(
      'TIKTOK_connected',
    );
    const account = await fixture.db.socialAccount.findFirstOrThrow({
      where: { userId: fixture.userId, provider: 'TIKTOK' },
    });
    const bundle = JSON.parse(
      fixture.tiktok.vault.open(account.tokenCiphertext!, account.providerAccountId),
    );
    expect(bundle).toMatchObject({ accessToken: 'access-secret', refreshToken: 'refresh-secret' });
    expect(account.scopes).toEqual(['user.info.basic', 'video.publish']);
    expect(
      await fixture.db.account.count({ where: { userId: fixture.userId, providerId: 'tiktok' } }),
    ).toBe(0);
    expect((await fixture.agent.get(callback(state))).headers.location).toContain(
      'TIKTOK_INVALID_OAUTH_STATE',
    );
    const workspace = await fixture.agent.get('/api/workspace');
    expect(workspace.body.tiktokConfigured).toBe(true);
    expect(JSON.stringify(workspace.body)).not.toMatch(
      /access-secret|refresh-secret|tokenCiphertext/,
    );
  });
  it('rejects expired and provider-mismatched states, session changes and denied authorization before provider calls', async () => {
    const expired = await start();
    await fixture.db.oAuthAttempt.updateMany({ data: { expiresAt: new Date(0) } });
    expect((await fixture.agent.get(callback(expired))).headers.location).toContain(
      'TIKTOK_INVALID_OAUTH_STATE',
    );
    const cross = await start();
    await fixture.db.oAuthAttempt.updateMany({ data: { mode: 'facebook-connect' } });
    expect((await fixture.agent.get(callback(cross))).headers.location).toContain(
      'TIKTOK_INVALID_OAUTH_STATE',
    );
    const denied = await start();
    expect(
      (await fixture.agent.get(`/api/auth/tiktok/callback?state=${denied}&error=access_denied`))
        .headers.location,
    ).toContain('TIKTOK_AUTHORIZATION_DECLINED');
    const changed = await start();
    await fixture.agent.post('/api/auth/sign-out').set('Origin', testOrigin).send({});
    expect((await fixture.agent.get(callback(changed))).headers.location).toContain(
      'TIKTOK_SESSION_CHANGED',
    );
    expect(fixture.tiktok.fetcher).not.toHaveBeenCalled();
  });
});

describe('TikTok immutable identity and granted permissions', () => {
  it('rejects missing publish grants and profile identity mismatch', async () => {
    fixture.tiktok.state.scopes = false;
    expect((await fixture.agent.get(callback(await start()))).headers.location).toContain(
      'TIKTOK_PERMISSION_REQUIRED',
    );
    fixture.tiktok.state.scopes = true;
    fixture.tiktok.state.mismatch = true;
    expect((await fixture.agent.get(callback(await start()))).headers.location).toContain(
      'TIKTOK_ACCOUNT_MISMATCH',
    );
    expect(
      await fixture.db.socialAccount.count({
        where: { userId: fixture.userId, provider: 'TIKTOK' },
      }),
    ).toBe(0);
  });
  it('cannot transfer another creator’s account and reconnects the same identity without duplicates', async () => {
    const other = await createTikTokWorkspaceFixture();
    try {
      other.tiktok.state.openId = fixture.tiktok.state.openId;
      await other.connect();
      expect((await fixture.agent.get(callback(await start()))).headers.location).toContain(
        'TIKTOK_ACCOUNT_ALREADY_LINKED',
      );
      expect(
        await fixture.db.socialAccount.count({
          where: { userId: fixture.userId, provider: 'TIKTOK' },
        }),
      ).toBe(0);
    } finally {
      await other.close();
    }
    await fixture.connect();
    await fixture.connect();
    expect(
      await fixture.db.socialAccount.count({
        where: { userId: fixture.userId, provider: 'TIKTOK' },
      }),
    ).toBe(1);
  });
});
