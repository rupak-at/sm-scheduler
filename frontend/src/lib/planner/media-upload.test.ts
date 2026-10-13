import { afterEach, expect, it, vi } from 'vitest';
import { transferMedia } from './media-upload';

const id = 'ffe4e519-3886-44b2-b39e-0a67194b73e0';
const ticket = {
  id,
  url: `https://api.example/api/media/upload/${id}`,
  token: 'test-token-with-at-least-thirty-two-characters',
};
afterEach(() => vi.unstubAllGlobals());

it('sends only small authorization JSON through Next.js and uploads file bytes directly to Express', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(ticket))
    .mockResolvedValueOnce(
      Response.json({
        id,
        url: `/api/workspace/media/${id}`,
        mimeType: 'image/jpeg',
        width: 800,
        height: 1000,
      }),
    );
  vi.stubGlobal('fetch', fetcher);
  const file = new File([new Uint8Array(5 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
  const media = await transferMedia(file, new AbortController().signal);
  expect(media.id).toBe(id);
  expect(fetcher.mock.calls[0]?.[0]).toBe('/api/workspace/media/ticket');
  expect(fetcher.mock.calls[0]?.[1]?.body).toBe(
    JSON.stringify({ mimeType: 'image/jpeg', sizeBytes: file.size }),
  );
  expect(fetcher.mock.calls[1]?.[0]).toBe(ticket.url);
  expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
    body: file,
    credentials: 'omit',
    headers: { 'Content-Type': 'image/jpeg', Authorization: `Bearer ${ticket.token}` },
  });
});
it('does not transfer bytes when upload authorization fails', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ error: 'Log in again.' }, { status: 401 }));
  vi.stubGlobal('fetch', fetcher);
  await expect(
    transferMedia(
      new File(['image'], 'photo.jpg', { type: 'image/jpeg' }),
      new AbortController().signal,
    ),
  ).rejects.toThrow('Log in again.');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('shares cancellation with both requests and rejects oversized inputs before contacting the API', async () => {
  const controller = new AbortController();
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, options) => {
    controller.abort();
    expect(options?.signal?.aborted).toBe(true);
    throw new DOMException('Aborted', 'AbortError');
  });
  vi.stubGlobal('fetch', fetcher);
  await expect(
    transferMedia(new File(['image'], 'photo.jpg', { type: 'image/jpeg' }), controller.signal),
  ).rejects.toMatchObject({ name: 'AbortError' });
  fetcher.mockClear();
  await expect(
    transferMedia(
      new File([new Uint8Array(9 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' }),
      new AbortController().signal,
    ),
  ).rejects.toThrow('8 MB');
  expect(fetcher).not.toHaveBeenCalled();
});
