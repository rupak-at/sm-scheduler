import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import type { AuthGateway } from './auth.types.js';

const user = {
  id: 'e4a9fc59-1d7f-477e-851e-79f94b416c25',
  name: 'Creator',
  email: 'creator@example.com',
};

function testApp(session: { user: typeof user } | null) {
  const auth: AuthGateway = {
    handler: (_request, response) => {
      response.sendStatus(204);
    },
    getSession: vi.fn(async (headers) => (headers.get('cookie') ? session : null)),
  };
  return createApp({
    webOrigin: 'http://localhost:3000',
    checks: { database: async () => 1, redis: async () => 'PONG' },
    auth,
  });
}

describe('protected account endpoint', () => {
  it('rejects missing and untrusted origins on authentication writes', async () => {
    const app = testApp(null);
    expect((await request(app).post('/api/auth/sign-up/email')).status).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/auth/sign-in/email')
          .set('Origin', 'https://untrusted.example')
      ).status,
    ).toBe(403);
  });
  it('rejects missing and revoked sessions', async () => {
    expect((await request(testApp({ user })).get('/api/me')).status).toBe(401);
    expect(
      (await request(testApp(null)).get('/api/me').set('Cookie', 'session=revoked')).status,
    ).toBe(401);
  });
  it('returns only the authenticated profile and disables caching', async () => {
    const result = await request(testApp({ user })).get('/api/me').set('Cookie', 'session=valid');
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ user });
    expect(result.headers['cache-control']).toBe('no-store');
  });
});
