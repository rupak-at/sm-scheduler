import { expect, it, vi } from 'vitest';
import { downloadProtectedMedia } from './remote-download.js';
it('resolves protected Cloudinary redirects on the server without leaking headers or following foreign hosts', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'https://res.cloudinary.com/cloud/asset.jpg' },
      }),
    )
    .mockResolvedValueOnce(new Response('photo'));
  expect(
    await downloadProtectedMedia('https://api.cloudinary.com/v1/download', 8, fetcher),
  ).toEqual(Buffer.from('photo'));
  expect(fetcher.mock.calls[1]![1]?.headers).toBeUndefined();
  fetcher.mockResolvedValueOnce(
    new Response(null, { status: 302, headers: { location: 'https://evil.example/secret' } }),
  );
  await expect(
    downloadProtectedMedia('https://api.cloudinary.com/v1/download', 8, fetcher),
  ).rejects.toThrow();
  expect(fetcher.mock.calls.some(([url]) => String(url).includes('evil.example'))).toBe(false);
});
it('bounds remote content length and actual streamed bytes and rejects non-HTTPS download sources', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response('too-long', { headers: { 'Content-Length': '99' } }))
    .mockResolvedValueOnce(new Response('too-long'));
  await expect(
    downloadProtectedMedia('https://api.cloudinary.com/download', 4, fetcher),
  ).rejects.toThrow();
  await expect(
    downloadProtectedMedia('https://api.cloudinary.com/download', 4, fetcher),
  ).rejects.toThrow();
  await expect(
    downloadProtectedMedia('http://res.cloudinary.com/download', 4, fetcher),
  ).rejects.toThrow();
});
