import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { TokenVault } from '@social-scheduler/publishing';
import { createAuthentication } from '../../apps/api/src/modules/auth/auth.service.js';
import { createApp } from '../../apps/api/src/app.js';
import { instagramFixture, testKey, testOrigin, testSecret } from './fixtures/instagram.js';
import { integrationDatabase, deleteTestUsers } from './fixtures/database.js';
const db = integrationDatabase();
const fixture = instagramFixture();
const userIds: string[] = [];
const auth = createAuthentication({
  database: db,
  secret: testSecret,
  webOrigin: testOrigin,
  production: false,
  instagram: {
    database: db,
    client: fixture.client,
    vault: new TokenVault(testKey),
    webOrigin: testOrigin,
    production: false,
  },
});
const app = createApp({
  webOrigin: testOrigin,
  auth,
  checks: { database: async () => {}, redis: async () => {} },
});
async function start(agent: ReturnType<typeof request.agent>, mode = 'login') {
  const response = await agent
    .post('/api/auth/instagram/start')
    .set('Origin', testOrigin)
    .send({ mode });
  expect(response.status).toBe(200);
  return new URL(response.body.url).searchParams.get('state')!;
}
beforeEach(async () => {
  await db.rateLimit.deleteMany();
});
afterAll(async () => {
  await deleteTestUsers(db, userIds);
  await db.oAuthAttempt.deleteMany();
  await db.$disconnect();
});

describe('Instagram sign-in security with real sessions and PostgreSQL', () => {
  it('requires the initiating browser, consumes state once, and saves encrypted tokens', async () => {
    const agent = request.agent(app);
    const state = await start(agent);
    const foreign = await request(app).get(`/api/auth/instagram/callback?state=${state}&code=code`);
    expect(foreign.headers.location).toContain('INVALID_OAUTH_STATE');
    expect(fixture.fetcher).not.toHaveBeenCalled();
    const callback = await agent.get(`/api/auth/instagram/callback?state=${state}&code=code`);
    expect(callback.headers.location).toBe(`${testOrigin}/planner?connection=connected`);
    const session = await agent.get('/api/me');
    expect(session.status).toBe(200);
    userIds.push(session.body.user.id);
    const channel = await db.socialAccount.findFirstOrThrow({
      where: { userId: session.body.user.id },
    });
    expect(new TokenVault(testKey).open(channel.tokenCiphertext!, channel.providerAccountId)).toBe(
      'long-secret',
    );
    expect(channel.scopes).toEqual([
      'instagram_business_basic',
      'instagram_business_content_publish',
    ]);
    expect(
      fixture.fetcher.mock.calls.some(([input]) =>
        new URL(String(input)).pathname.endsWith('/permissions'),
      ),
    ).toBe(false);
    expect(
      await db.account.findFirstOrThrow({ where: { userId: session.body.user.id } }),
    ).toMatchObject({ accessToken: null, refreshToken: null });
    const user = await db.user.findUniqueOrThrow({ where: { id: session.body.user.id } });
    expect(user.emailVerified).toBe(false);
    const replay = await agent.get(`/api/auth/instagram/callback?state=${state}&code=code`);
    expect(replay.headers.location).toContain('INVALID_OAUTH_STATE');
  });
  it('returns to the same user on later Instagram sign-in without email matching', async () => {
    const agent = request.agent(app);
    const state = await start(agent);
    await agent.get(`/api/auth/instagram/callback?state=${state}&code=code`);
    expect((await agent.get('/api/me')).body.user.id).toBe(userIds[0]);
    expect(await db.user.count({ where: { id: { in: userIds } } })).toBe(1);
  });
  it('rejects arbitrary request origins and unauthenticated connection attempts', async () => {
    expect(
      (
        await request(app)
          .post('/api/auth/instagram/start')
          .set('Origin', 'https://evil.example')
          .send({ mode: 'login' })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/auth/instagram/start')
          .set('Origin', testOrigin)
          .send({ mode: 'connect' })
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app).post('/api/auth/sign-up/email').set('Origin', testOrigin).send({
          name: 'Attacker',
          email: '998877@instagram.users.invalid',
          password: 'long-enough-passphrase',
        })
      ).status,
    ).toBe(400);
  });
});

describe('Email workspace linking', () => {
  it('links Instagram explicitly and opens the same email workspace on later Instagram login', async () => {
    const agent = request.agent(app);
    const signup = await agent
      .post('/api/auth/sign-up/email')
      .set('Origin', testOrigin)
      .send({
        name: 'Email creator',
        email: `${randomUUID()}@example.com`,
        password: 'long-enough-passphrase',
      });
    expect(signup.status).toBe(200);
    const userId: string = signup.body.user.id;
    userIds.push(userId);
    fixture.state.accountId = '445566';
    const connection = await start(agent, 'connect');
    expect(
      (await agent.get(`/api/auth/instagram/callback?state=${connection}&code=code`)).headers
        .location,
    ).toContain('connection=connected');
    await agent.post('/api/auth/sign-out').set('Origin', testOrigin).send({});
    const login = await start(agent);
    await agent.get(`/api/auth/instagram/callback?state=${login}&code=code`);
    expect((await agent.get('/api/me')).body.user.id).toBe(userId);
    fixture.state.accountId = '123456';
  });
});

describe('Instagram linking and approval failures', () => {
  it('does not transfer an existing Instagram identity to another logged-in user', async () => {
    const agent = request.agent(app);
    const signup = await agent
      .post('/api/auth/sign-up/email')
      .set('Origin', testOrigin)
      .send({
        name: 'Other creator',
        email: `${randomUUID()}@example.com`,
        password: 'long-enough-passphrase',
      });
    expect(signup.status).toBe(200);
    userIds.push(signup.body.user.id);
    const state = await start(agent, 'connect');
    const callback = await agent.get(`/api/auth/instagram/callback?state=${state}&code=code`);
    expect(callback.headers.location).toContain('ACCOUNT_ALREADY_LINKED');
    expect((await agent.get('/api/me')).body.user.id).toBe(userIds[2]);
    expect(await db.socialAccount.count({ where: { userId: userIds[2]! } })).toBe(0);
  });
  it('rejects revoked sessions captured for account linking', async () => {
    const agent = request.agent(app);
    const signup = await agent
      .post('/api/auth/sign-up/email')
      .set('Origin', testOrigin)
      .send({
        name: 'Logged out creator',
        email: `${randomUUID()}@example.com`,
        password: 'long-enough-passphrase',
      });
    userIds.push(signup.body.user.id);
    const state = await start(agent, 'connect');
    await agent.post('/api/auth/sign-out').set('Origin', testOrigin).send({});
    const calls = fixture.fetcher.mock.calls.length;
    expect(
      (await agent.get(`/api/auth/instagram/callback?state=${state}&code=code`)).headers.location,
    ).toContain('SESSION_CHANGED');
    expect(fixture.fetcher.mock.calls.length).toBe(calls);
  });
  it('does not create a user when permissions are missing or state expired', async () => {
    const agent = request.agent(app);
    fixture.state.accountId = '654321';
    fixture.state.scopes = false;
    const state = await start(agent);
    expect(
      (await agent.get(`/api/auth/instagram/callback?state=${state}&code=code`)).headers.location,
    ).toContain('PERMISSION_REQUIRED');
    expect(
      await db.account.count({ where: { providerId: 'instagram', accountId: '654321' } }),
    ).toBe(0);
    fixture.state.scopes = true;
    const expired = await start(agent);
    await db.oAuthAttempt.updateMany({ data: { expiresAt: new Date(0) } });
    expect(
      (await agent.get(`/api/auth/instagram/callback?state=${expired}&code=code`)).headers.location,
    ).toContain('INVALID_OAUTH_STATE');
  });
});
