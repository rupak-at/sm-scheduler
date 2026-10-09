import { randomUUID } from 'node:crypto';
import { parseApiEnvironment } from '@social-scheduler/config';
import { createDatabase } from '@social-scheduler/database';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import { createResources } from '../../apps/api/src/lib/resources.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const redisUrl = process.env.TEST_REDIS_URL;
if (!databaseUrl || !redisUrl)
  throw new Error('Set TEST_DATABASE_URL and TEST_REDIS_URL to isolated test services');

const origin = 'http://localhost:3000';
const resources = createResources(
  parseApiEnvironment({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    WEB_ORIGIN: origin,
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    BETTER_AUTH_SECRET: 'integration-only-secret-not-for-production',
  }),
);
const database = createDatabase(databaseUrl);
const app = createApp({ webOrigin: origin, checks: resources.checks, auth: resources.auth });
const email = `creator-${randomUUID()}@example.com`;
const password = 'A-long-test-passphrase-42';

beforeAll(async () => {
  await resources.checks.database();
});
afterAll(async () => {
  const user = await database.user.findUnique({ where: { email } });
  if (user) await database.user.delete({ where: { id: user.id } });
  await Promise.all([database.$disconnect(), resources.close()]);
});

describe('real PostgreSQL-backed authentication', () => {
  it('rejects a cross-origin signup', async () => {
    const result = await request(app)
      .post('/api/auth/sign-up/email')
      .set('Origin', 'https://untrusted.example')
      .send({ name: 'Creator', email, password });
    expect(result.status).toBe(403);
    expect(await database.user.findUnique({ where: { email } })).toBeNull();
  });

  it('hashes passwords, persists sessions, and revokes them on logout', async () => {
    const agent = request.agent(app);
    const signup = await agent
      .post('/api/auth/sign-up/email')
      .set('Origin', origin)
      .send({ name: 'Creator', email, password });
    expect(signup.status).toBe(200);
    expect(String(signup.headers['set-cookie'] ?? '')).toMatch(/httponly/i);
    const profile = await agent.get('/api/me');
    expect(profile.status).toBe(200);
    const account = await database.account.findFirstOrThrow({
      where: { userId: profile.body.user.id },
    });
    expect(account.password).toBeTruthy();
    expect(account.password).not.toBe(password);
    expect(await database.session.count({ where: { userId: profile.body.user.id } })).toBe(1);
    expect((await agent.post('/api/auth/sign-out').set('Origin', origin).send({})).status).toBe(
      200,
    );
    expect((await agent.get('/api/me')).status).toBe(401);
    expect(await database.session.count({ where: { userId: profile.body.user.id } })).toBe(0);
  });

  it('rejects wrong passwords and expired sessions', async () => {
    const agent = request.agent(app);
    const wrong = await agent
      .post('/api/auth/sign-in/email')
      .set('Origin', origin)
      .send({ email, password: 'the-wrong-passphrase' });
    expect(wrong.status).toBe(401);
    expect((await agent.get('/api/me')).status).toBe(401);
    const login = await agent
      .post('/api/auth/sign-in/email')
      .set('Origin', origin)
      .send({ email, password });
    expect(login.status).toBe(200);
    const user = await database.user.findUniqueOrThrow({ where: { email } });
    await database.session.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(0) },
    });
    expect((await agent.get('/api/me')).status).toBe(401);
  });
});
