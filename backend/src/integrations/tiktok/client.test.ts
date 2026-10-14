import { describe, expect, it, vi } from 'vitest';
import { TikTokClient } from './client.js';
import { parseTikTokJson, tiktokRequest } from './http.js';
import { publishSchema, statusSchema } from './schemas.js';
import { tiktokSettingsSchema } from '@social-scheduler/shared';
import { TokenVault } from '../instagram/token-crypto.js';
const options = {
  clientKey: 'fixture-key',
  clientSecret: 'private-secret',
  redirectUri: 'https://web.example/api/auth/tiktok/callback',
};
const settings = tiktokSettingsSchema.parse({
  privacy: 'SELF_ONLY',
  consent: true,
  photoTitle: 'Photo title',
});
const token = {
  open_id: 'creator-1',
  access_token: 'secret',
  refresh_token: 'refresh-secret',
  expires_in: 86400,
  refresh_expires_in: 31536000,
  token_type: 'Bearer',
  scope: 'user.info.basic,video.publish',
};

describe('TikTok authorization and publishing requests', () => {
  it('uses the current Web Login endpoint, exact callback, browser state and minimal granted scopes', () => {
    const url = new URL(new TikTokClient(options).authorizationUrl('state'));
    expect(url.origin + url.pathname).toBe('https://www.tiktok.com/v2/auth/authorize/');
    expect(url.searchParams.get('state')).toBe('state');
    expect(url.searchParams.get('scope')).toBe('user.info.basic,video.publish');
    expect(url.searchParams.get('redirect_uri')).toBe(options.redirectUri);
  });
  it('requires actual scopes and immutable open_id from the profile, including refresh responses', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ ...token, scope: 'user.info.basic' }));
    const client = new TikTokClient(options, fetcher);
    await expect(client.exchange('code')).rejects.toThrow('PERMISSION_REQUIRED');
    fetcher.mockResolvedValueOnce(Response.json(token)).mockResolvedValueOnce(
      Response.json({
        data: { user: { open_id: 'foreign', display_name: 'Same name' } },
        error: { code: 'ok' },
      }),
    );
    await expect(client.exchange('code')).rejects.toThrow('ACCOUNT_MISMATCH');
    fetcher.mockResolvedValueOnce(Response.json({ ...token, open_id: 'foreign' }));
    await expect(client.refresh('refresh-secret', 'creator-1')).rejects.toThrow('ACCOUNT_MISMATCH');
  });
});

describe('TikTok media requests and identity preservation', () => {
  it('sends captioned video/photo metadata with deliberate privacy, interactions and no token in the URL', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        Response.json({ data: { publish_id: 'p-1' }, error: { code: 'ok' } }),
      );
    const client = new TikTokClient(options, fetcher);
    await client.publish('secret', 'https://media.example/photo', 'Photo #tag', settings, false);
    await client.publish(
      'secret',
      'https://media.example/video',
      'Video #tag',
      { ...settings, allowComment: true, aiGenerated: true },
      true,
    );
    const photo = JSON.parse(String(fetcher.mock.calls[0]![1]?.body));
    const video = JSON.parse(String(fetcher.mock.calls[1]![1]?.body));
    expect(photo).toMatchObject({
      media_type: 'PHOTO',
      post_mode: 'DIRECT_POST',
      post_info: {
        title: 'Photo title',
        description: 'Photo #tag',
        privacy_level: 'SELF_ONLY',
        disable_comment: true,
        auto_add_music: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        photo_images: ['https://media.example/photo'],
        photo_cover_index: 0,
      },
    });
    expect(video).toMatchObject({
      post_info: {
        title: 'Video #tag',
        disable_comment: false,
        disable_duet: true,
        disable_stitch: true,
        is_aigc: true,
      },
      source_info: { source: 'PULL_FROM_URL', video_url: 'https://media.example/video' },
    });
    for (const [url, init] of fetcher.mock.calls) {
      expect(String(url)).not.toContain('secret');
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer secret');
    }
  });
  it('keeps 64-bit numeric post IDs exact and never treats inbox delivery as completed Direct Post', () => {
    const data = parseTikTokJson(
      '{"data":{"status":"PUBLISH_COMPLETE","publicaly_available_post_id":[7600000000000000123]},"error":{"code":"ok"}}',
    );
    expect(statusSchema.parse(data).publicaly_available_post_id).toEqual(['7600000000000000123']);
    expect(
      statusSchema.parse({ data: { status: 'SEND_TO_USER_INBOX' }, error: { code: 'ok' } }).status,
    ).toBe('SEND_TO_USER_INBOX');
  });
  it('encrypts access and refresh bundles with provider-specific authenticated data', () => {
    const key = Buffer.alloc(32, 7).toString('base64');
    const vault = new TokenVault(key, 'tiktok');
    const ciphertext = vault.seal(
      JSON.stringify({ accessToken: 'secret', refreshToken: 'refresh' }),
      'creator-1',
    );
    expect(vault.open(ciphertext, 'creator-1')).toContain('refresh');
    expect(() => new TokenVault(key, 'facebook').open(ciphertext, 'creator-1')).toThrow();
    expect(() => vault.open(ciphertext, 'foreign')).toThrow();
  });
});

describe('TikTok response safety', () => {
  it.each([
    ['access_token_invalid', 'TOKEN_REVOKED'],
    ['scope_not_authorized', 'PERMISSION_REQUIRED'],
    ['spam_risk_too_many_posts', 'CREATOR_POSTING_UNAVAILABLE'],
    ['reached_active_user_cap', 'CREATOR_POSTING_UNAVAILABLE'],
    ['rate_limit_exceeded', 'RATE_LIMITED'],
    ['url_ownership_unverified', 'MEDIA_DOMAIN_UNVERIFIED'],
  ])('handles HTTP-200 provider errors such as %s without raw messages', async (code, category) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ error: { code, message: 'private-secret' } }));
    const error = await tiktokRequest(fetcher, '/v2/test/', {}, publishSchema).catch(
      (error: unknown) => error,
    );
    expect(error).toMatchObject({ code: category, uncertain: false });
    expect(JSON.stringify(error)).not.toContain('private-secret');
  });
  it('distinguishes ambiguous writes from read-only POSTs and rejects malformed successes', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('private-secret'));
    await expect(
      tiktokRequest(fetcher, '/v2/test/', { method: 'POST' }, publishSchema, true),
    ).rejects.toMatchObject({ uncertain: true });
    await expect(
      tiktokRequest(fetcher, '/v2/test/', { method: 'POST' }, publishSchema),
    ).rejects.toMatchObject({ uncertain: false });
    fetcher.mockResolvedValue(Response.json({ data: { id: 'fake' }, error: { code: 'ok' } }));
    await expect(
      tiktokRequest(fetcher, '/v2/test/', { method: 'POST' }, publishSchema, true),
    ).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE', uncertain: true });
  });
});
