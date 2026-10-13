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

  it('requires exact callback origin and a valid independent token key', () => {
    const configured = {
      ...valid,
      WEB_ORIGIN: 'https://scheduler.example',
      INSTAGRAM_APP_ID: '123',
      INSTAGRAM_APP_SECRET: 'not-a-real-app-secret',
      INSTAGRAM_GRAPH_VERSION: 'v25.0',
      INSTAGRAM_REDIRECT_URI: 'https://scheduler.example/api/auth/instagram/callback',
      TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString('base64'),
    };
    expect(parseApiEnvironment(configured).INSTAGRAM_APP_ID).toBe('123');
    expect(() =>
      parseApiEnvironment({
        ...configured,
        INSTAGRAM_REDIRECT_URI: 'https://other.example/api/auth/instagram/callback',
      }),
    ).toThrow('INSTAGRAM_REDIRECT_URI');
    expect(() =>
      parseApiEnvironment({ ...configured, TOKEN_ENCRYPTION_KEY: 'private-invalid-secret' }),
    ).toThrow('TOKEN_ENCRYPTION_KEY');
  });

  it('validates Cloudinary credentials together and requires HTTPS for browser-facing production uploads', () => {
    expect(() => parseApiEnvironment({ ...valid, CLOUDINARY_CLOUD_NAME: 'private-cloud' })).toThrow(
      'CLOUDINARY_API_KEY',
    );
    const configured = {
      ...valid,
      CLOUDINARY_CLOUD_NAME: 'fixture-cloud',
      CLOUDINARY_API_KEY: '1234',
      CLOUDINARY_API_SECRET: 'fixture-not-a-live-secret',
    };
    expect(parseApiEnvironment(configured).CLOUDINARY_FOLDER).toBe('social-scheduler');
    expect(() => parseApiEnvironment({ ...configured, CLOUDINARY_FOLDER: '../escape' })).toThrow(
      'CLOUDINARY_FOLDER',
    );
    expect(() =>
      parseApiEnvironment({
        ...configured,
        NODE_ENV: 'production',
        WEB_ORIGIN: 'https://web.example',
      }),
    ).toThrow('API_PUBLIC_URL');
    expect(
      parseApiEnvironment({
        ...configured,
        NODE_ENV: 'production',
        WEB_ORIGIN: 'https://web.example',
        API_PUBLIC_URL: 'https://api.example',
      }).NODE_ENV,
    ).toBe('production');
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
