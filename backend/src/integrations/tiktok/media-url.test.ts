import { expect, it } from 'vitest';
import { tiktokMediaUrl, tiktokMediaAuthorized } from './media-url.js';
import { randomUUID } from 'node:crypto';
it('binds signed TikTok media to the publication, asset, expiration and configured HTTPS origin', () => {
  const publication = randomUUID(),
    asset = randomUUID();
  const url = new URL(tiktokMediaUrl('https://media.example', 'key', publication, asset));
  const expires = Number(url.searchParams.get('expires')),
    signature = url.searchParams.get('signature')!;
  expect(url.pathname).toBe(`/api/media/tiktok/${publication}/${asset}`);
  expect(tiktokMediaAuthorized('key', publication, asset, expires, signature)).toBe(true);
  expect(tiktokMediaAuthorized('key', randomUUID(), asset, expires, signature)).toBe(false);
  expect(tiktokMediaAuthorized('key', publication, randomUUID(), expires, signature)).toBe(false);
  expect(tiktokMediaAuthorized('other-key', publication, asset, expires, signature)).toBe(false);
  expect(tiktokMediaAuthorized('key', publication, asset, 1, signature)).toBe(false);
  expect(tiktokMediaAuthorized('key', publication, asset, expires + 100000, signature)).toBe(false);
  expect(() => tiktokMediaUrl('http://media.example', 'key', publication, asset)).toThrow();
  expect(() =>
    tiktokMediaUrl('https://secret@media.example/path', 'key', publication, asset),
  ).toThrow();
});
