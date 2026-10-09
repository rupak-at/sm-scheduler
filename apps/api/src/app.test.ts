import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

const createTestApp = (database = async () => 1) =>
  createApp({
    webOrigin: 'http://localhost:3000',
    checks: { database, redis: async () => 'PONG' },
  });

describe('API health and HTTP boundaries', () => {
  it('keeps liveness independent of unavailable infrastructure', async () => {
    const app = createTestApp(async () => {
      throw new Error('postgresql://secret');
    });
    const live = await request(app).get('/health/live');
    expect(live.status).toBe(200);
    const ready = await request(app).get('/health/ready');
    expect(ready.status).toBe(503);
    expect(ready.body.dependencies).toEqual({ database: 'down', redis: 'up' });
    expect(ready.text).not.toContain('secret');
  });

  it('reports ready only when both dependencies respond', async () => {
    const result = await request(createTestApp()).get('/health/ready');
    expect(result.status).toBe(200);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.body.status).toBe('ok');
  });

  it('does not authorize arbitrary browser origins', async () => {
    const result = await request(createTestApp())
      .get('/health/live')
      .set('Origin', 'https://untrusted.example');
    expect(result.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(result.headers['x-powered-by']).toBeUndefined();
  });

  it('returns consistent responses for unknown routes and malformed JSON', async () => {
    expect((await request(createTestApp()).get('/missing')).status).toBe(404);
    const result = await request(createTestApp())
      .post('/missing')
      .set('Content-Type', 'application/json')
      .send('{');
    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: 'Invalid JSON body' });
  });
});
