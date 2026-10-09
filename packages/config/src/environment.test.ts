import { describe, expect, it } from 'vitest';
import { parseApiEnvironment, parseWorkerEnvironment } from './environment.js';
import { redisConnectionOptions } from './redis.js';

const valid = {
  BETTER_AUTH_SECRET: 'test-only-secret-at-least-32-characters',
  DATABASE_URL: 'postgresql://user:secret@localhost:5432/scheduler',
  REDIS_URL: 'redis://localhost:6379',
  WEB_ORIGIN: 'http://localhost:3000',
};

describe('runtime configuration', () => {
  it('rejects missing credentials without leaking values', () => {
    expect(() => parseApiEnvironment({ ...valid, REDIS_URL: 'private-secret' })).toThrow(
      'Invalid environment configuration: REDIS_URL',
    );
    expect(() => parseWorkerEnvironment({})).toThrow('DATABASE_URL, REDIS_URL');
  });

  it('rejects invalid ports and worker concurrency', () => {
    expect(() => parseApiEnvironment({ ...valid, API_PORT: '65536' })).toThrow('API_PORT');
    expect(() => parseWorkerEnvironment({ ...valid, WORKER_CONCURRENCY: '0' })).toThrow(
      'WORKER_CONCURRENCY',
    );
  });

  it('preserves Redis TLS, credentials, and database selection', () => {
    expect(redisConnectionOptions('rediss://user:p%40ss@cache.example:6380/2')).toEqual({
      host: 'cache.example',
      port: 6380,
      db: 2,
      username: 'user',
      password: 'p@ss',
      tls: {},
    });
    expect(() => redisConnectionOptions('redis://localhost/not-a-number')).toThrow();
  });
});
