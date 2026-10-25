import { expect, it } from 'vitest';
import { parseApiEnvironment, parseWorkerEnvironment } from './environment.js';
import { youtubeCredentials } from './youtube.js';

it('configures YouTube independently with an exact HTTPS callback and independent key', () => {
  const env = {
    WEB_ORIGIN: 'https://scheduler.example',
    DATABASE_URL: 'postgresql://test@localhost/test',
    REDIS_URL: 'redis://localhost',
    BETTER_AUTH_SECRET: 'fixture-only-secret-at-least-32-characters',
    YOUTUBE_CLIENT_ID: 'fixture-client',
    YOUTUBE_CLIENT_SECRET: 'fixture-only-secret',
    YOUTUBE_REDIRECT_URI: 'https://scheduler.example/api/auth/youtube/callback',
    TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  };
  expect(youtubeCredentials(parseApiEnvironment(env))).not.toBeNull();
  expect(parseWorkerEnvironment(env).YOUTUBE_CLIENT_ID).toBe('fixture-client');
  expect(() =>
    parseApiEnvironment({ ...env, YOUTUBE_REDIRECT_URI: 'https://evil.example/callback' }),
  ).toThrow('YOUTUBE_REDIRECT_URI');
  expect(youtubeCredentials({})).toBeNull();
});
