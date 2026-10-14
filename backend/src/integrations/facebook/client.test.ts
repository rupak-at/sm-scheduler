import { describe, expect, it, vi } from 'vitest';
import { FacebookClient } from './client.js';
import { facebookRequest } from './http.js';
import { validateFacebookGrant } from './grants.js';
import { FACEBOOK_SCOPES, photoResultSchema } from './schemas.js';
import { TokenVault } from '../instagram/token-crypto.js';

const options = {
  appId: '123',
  appSecret: 'private-app-secret',
  redirectUri: 'https://web.example/api/auth/facebook/callback',
  version: 'v26.0',
};
const grant = {
  app_id: '123',
  type: 'PAGE',
  profile_id: '778899',
  is_valid: true,
  expires_at: 0,
  data_access_expires_at: 0,
  scopes: FACEBOOK_SCOPES,
};

describe('Facebook authorization and grant validation', () => {
  it('requests only listing, reading and publishing scopes with an exact callback and state', () => {
    const url = new URL(new FacebookClient(options).authorizationUrl('browser-state'));
    expect(url.origin).toBe('https://www.facebook.com');
    expect(url.pathname).toBe('/v26.0/dialog/oauth');
    expect(url.searchParams.get('scope')).toBe(FACEBOOK_SCOPES.join(','));
    expect(url.searchParams.get('redirect_uri')).toBe(options.redirectUri);
    expect(url.searchParams.get('state')).toBe('browser-state');
    const business = new URL(
      new FacebookClient({ ...options, configId: '456' }).authorizationUrl('state'),
    );
    expect(business.searchParams.get('config_id')).toBe('456');
  });
  it('uses actual token and data-access expiries, including the no-expiry sentinel', () => {
    expect(validateFacebookGrant(grant, '123', '778899')).toBeNull();
    const expiry = Math.floor(Date.now() / 1000) + 86400;
    expect(
      validateFacebookGrant(
        { ...grant, data_access_expires_at: expiry },
        '123',
        '778899',
      )?.getTime(),
    ).toBe(expiry * 1000);
    expect(() => validateFacebookGrant({ ...grant, expires_at: 1 }, '123', '778899')).toThrow(
      'TOKEN_EXPIRED',
    );
  });
  it.each([
    [{ ...grant, app_id: '999' }, 'ACCOUNT_MISMATCH'],
    [{ ...grant, profile_id: '999' }, 'ACCOUNT_MISMATCH'],
    [{ ...grant, type: 'USER' }, 'ACCOUNT_MISMATCH'],
    [{ ...grant, is_valid: false }, 'TOKEN_REVOKED'],
    [{ ...grant, scopes: ['pages_show_list'] }, 'PERMISSION_REQUIRED'],
    [
      { ...grant, granular_scopes: [{ scope: 'pages_manage_posts', target_ids: ['999'] }] },
      'PERMISSION_REQUIRED',
    ],
  ])(
    'rejects foreign apps, Pages, token types, revocation and missing/limited grants',
    (input, code) => {
      expect(() => validateFacebookGrant(input, '123', '778899')).toThrow(code);
    },
  );
  it('authenticates ciphertext to the provider and Page while retaining existing Instagram ciphertext support', () => {
    const key = Buffer.alloc(32, 7).toString('base64');
    const facebook = new TokenVault(key, 'facebook'),
      instagram = new TokenVault(key);
    const encrypted = facebook.seal('page-secret', '778899');
    expect(facebook.open(encrypted, '778899')).toBe('page-secret');
    expect(() => instagram.open(encrypted, '778899')).toThrow();
    expect(() => facebook.open(encrypted, '999')).toThrow();
    expect(instagram.open(instagram.seal('ig-secret', '123'), '123')).toBe('ig-secret');
  });
});

describe('Facebook media requests and safe failures', () => {
  it('sends captions and signed media URLs in request bodies with server authorization and proof', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: '112233', post_id: '778899_112233' }))
      .mockResolvedValueOnce(Response.json({ id: '990011' }));
    const client = new FacebookClient(options, fetcher);
    await client.publishPhoto(
      '778899',
      'page-secret',
      'https://cdn.example/photo.jpg?signature=secret',
      'Photo #tag',
    );
    await client.publishVideo(
      '778899',
      'page-secret',
      'https://cdn.example/video.mp4?signature=secret',
      'Video #tag',
    );
    for (const [index, [, init]] of fetcher.mock.calls.entries()) {
      expect(init?.method).toBe('POST');
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer page-secret');
      const body = new URLSearchParams(String(init?.body));
      expect(body.get('published')).toBe('true');
      expect(body.get('appsecret_proof')).toMatch(/^[a-f0-9]{64}$/);
      expect(body.get(index ? 'description' : 'caption')).toBe(index ? 'Video #tag' : 'Photo #tag');
      expect(body.get(index ? 'file_url' : 'url')).toContain('signature=secret');
    }
    expect(String(fetcher.mock.calls[1]![0])).toBe(
      'https://graph-video.facebook.com/v26.0/778899/videos',
    );
  });
  it.each([
    [190, 'TOKEN_REVOKED'],
    [200, 'PERMISSION_REQUIRED'],
    [4, 'RATE_LIMITED'],
    [100, 'PROVIDER_REJECTED'],
  ])('maps Meta code %i without exposing raw response details', async (code, category) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ error: { code, message: 'private-secret' } }, { status: 400 }),
      );
    const error = await facebookRequest(
      fetcher,
      new URL('https://graph.facebook.com'),
      { method: 'POST' },
      photoResultSchema,
    ).catch((error: unknown) => error);
    expect(error).toMatchObject({ code: category, uncertain: false });
    expect(JSON.stringify(error)).not.toContain('private-secret');
  });
  it('keeps network, malformed and server-side write responses ambiguous', async () => {
    for (const response of [
      new Response('private-secret'),
      Response.json({ bad: 'private-secret' }),
      Response.json({ error: { code: 2 } }, { status: 503 }),
    ]) {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
      await expect(
        facebookRequest(
          fetcher,
          new URL('https://graph.facebook.com'),
          { method: 'POST' },
          photoResultSchema,
        ),
      ).rejects.toMatchObject({ uncertain: true });
    }
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('private-secret'));
    await expect(
      facebookRequest(
        fetcher,
        new URL('https://graph.facebook.com'),
        { method: 'POST' },
        photoResultSchema,
      ),
    ).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE', uncertain: true });
  });
});
