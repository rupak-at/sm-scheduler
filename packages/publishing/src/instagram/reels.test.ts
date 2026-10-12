import { describe, expect, it, vi } from 'vitest';
import { InstagramClient } from './client.js';

describe('Instagram Reel container contract', () => {
  it('sends a signed video URL and Reel type without credentials in the body', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: 'container' }));
    const client = new InstagramClient(
      {
        appId: '123',
        appSecret: 'private-secret',
        redirectUri: 'https://web.example/callback',
        version: 'v26.0',
      },
      fetcher,
    );
    await client.createReelContainer(
      'account',
      'private-token',
      'https://web.example/api/media/public/asset?signature=signed',
      'Caption\n\n#travel',
    );
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe('https://graph.instagram.com/v26.0/account/media');
    const params = new URLSearchParams(String(init?.body));
    expect(Object.fromEntries(params)).toEqual({
      media_type: 'REELS',
      video_url: 'https://web.example/api/media/public/asset?signature=signed',
      caption: 'Caption\n\n#travel',
      share_to_feed: 'true',
    });
    expect(params.has('image_url')).toBe(false);
    expect(String(init?.body)).not.toMatch(/private-secret|private-token/);
    expect(init?.headers).toEqual({ Authorization: 'Bearer private-token' });
  });
});
