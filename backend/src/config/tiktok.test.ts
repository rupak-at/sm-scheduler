import { expect, it } from 'vitest';
import { parseApiEnvironment, parseWorkerEnvironment } from './environment.js';
import { tiktokCredentials } from './tiktok.js';
const input = {
  DATABASE_URL: 'postgresql://user:secret@localhost/test',
  REDIS_URL: 'redis://localhost:6379',
  BETTER_AUTH_SECRET: 'test-only-secret-at-least-32-characters',
  WEB_ORIGIN: 'https://web.example',
  TIKTOK_CLIENT_KEY: 'fixture-key',
  TIKTOK_CLIENT_SECRET: 'private-client-secret',
  TIKTOK_REDIRECT_URI: 'https://web.example/api/auth/tiktok/callback',
  TIKTOK_MEDIA_ORIGIN: 'https://api.example',
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
};
it('enables TikTok independently, defaults to unaudited mode, and requires exact callback/HTTPS media settings', () => {
  const parsed = parseApiEnvironment(input);
  expect(tiktokCredentials(parsed)).toMatchObject({
    audited: false,
    mediaOrigin: 'https://api.example',
  });
  expect(
    parseWorkerEnvironment({ ...input, TIKTOK_DIRECT_POST_AUDITED: 'true' })
      .TIKTOK_DIRECT_POST_AUDITED,
  ).toBe(true);
  expect(() =>
    parseApiEnvironment({
      ...input,
      TIKTOK_REDIRECT_URI: 'https://foreign.example/api/auth/tiktok/callback',
    }),
  ).toThrow('TIKTOK_REDIRECT_URI');
  expect(() =>
    parseApiEnvironment({ ...input, TIKTOK_MEDIA_ORIGIN: 'http://api.example' }),
  ).toThrow('TIKTOK_MEDIA_ORIGIN');
  expect(() =>
    parseApiEnvironment({ ...input, TIKTOK_MEDIA_ORIGIN: 'https://secret@api.example/path' }),
  ).toThrow('TIKTOK_MEDIA_ORIGIN');
  expect(() => parseApiEnvironment({ ...input, TIKTOK_DIRECT_POST_AUDITED: 'yes' })).toThrow(
    'TIKTOK_DIRECT_POST_AUDITED',
  );
  expect(tiktokCredentials({ ...parsed, TIKTOK_CLIENT_SECRET: undefined })).toBeNull();
});
