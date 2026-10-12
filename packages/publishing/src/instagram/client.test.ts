import { describe, expect, it, vi } from 'vitest';
import { InstagramClient, INSTAGRAM_SCOPES } from './client.js';
import { instagramRequest } from './http.js';
import { z } from 'zod';
const options = {
  appId: '123',
  appSecret: 'not-a-real-app-secret',
  redirectUri: 'https://test.example/api/auth/instagram/callback',
  version: 'v25.0',
};
describe('Instagram protocol boundaries', () => {
  it('requests only profile and publishing scopes with the caller state', () => {
    const url = new URL(new InstagramClient(options).authorizationUrl('one-use-state'));
    expect(url.origin).toBe('https://www.instagram.com');
    expect(url.searchParams.get('state')).toBe('one-use-state');
    expect(url.searchParams.get('scope')).toBe(INSTAGRAM_SCOPES.join(','));
    expect(url.searchParams.has('client_secret')).toBe(false);
  });
  it('uses validated string identity even when numeric OAuth identifiers exceed safe integers', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              access_token: 'short-token',
              user_id: 17841405793187218,
              permissions: INSTAGRAM_SCOPES.join(','),
            },
          ],
        }),
      )
      .mockResolvedValueOnce(Response.json({ access_token: 'long-token', expires_in: 5184000 }))
      .mockResolvedValueOnce(
        Response.json({
          id: 'different-app-scoped-id',
          user_id: '17841405793187218',
          username: 'creator',
          account_type: 'BUSINESS',
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [{ quota_usage: 0 }],
        }),
      );
    const result = await new InstagramClient(options, fetcher).exchange('one-use-code');
    expect(result.profile.id).toBe('17841405793187218');
    expect(result.token).toBe('long-token');
    expect(result.scopes).toEqual(INSTAGRAM_SCOPES);
    expect(fetcher).toHaveBeenCalledTimes(4);
    const probe = new URL(String(fetcher.mock.calls[3]![0]));
    expect(probe.pathname).toBe('/v25.0/17841405793187218/content_publishing_limit');
    expect(probe.searchParams.get('fields')).toBe('quota_usage');
    expect(
      fetcher.mock.calls.some(([input]) =>
        new URL(String(input)).pathname.endsWith('/permissions'),
      ),
    ).toBe(false);
  });
});

describe('Instagram validation failures', () => {
  it('rejects personal accounts, denied publishing access, and identity changes', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ id: '1', username: 'creator', account_type: 'PERSONAL' }),
      );
    const client = new InstagramClient(options, fetcher);
    await expect(client.validate('private-token')).rejects.toThrow('INVALID_PROVIDER_RESPONSE');
    fetcher
      .mockResolvedValueOnce(
        Response.json({ id: '1', username: 'creator', account_type: 'BUSINESS' }),
      )
      .mockResolvedValueOnce(Response.json({ error: { code: 200 } }, { status: 403 }));
    await expect(client.validate('private-token')).rejects.toThrow('PERMISSION_REQUIRED');
    fetcher.mockResolvedValueOnce(
      Response.json({ id: '2', username: 'creator', account_type: 'BUSINESS' }),
    );
    await expect(client.validate('private-token', '1')).rejects.toThrow('ACCOUNT_MISMATCH');
  });
  it('never includes provider bodies or tokens in errors and treats lost writes as uncertain', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ error: { code: 190, message: 'private-token' } }, { status: 400 }),
      );
    await expect(
      instagramRequest(fetcher, 'https://graph.instagram.com/me', {}, z.object({ id: z.string() })),
    ).rejects.toMatchObject({ message: 'TOKEN_REVOKED', uncertain: false });
    fetcher.mockRejectedValueOnce(new Error('private-network-details'));
    await expect(
      instagramRequest(
        fetcher,
        'https://graph.instagram.com/media_publish',
        { method: 'POST' },
        z.object({ id: z.string() }),
      ),
    ).rejects.toMatchObject({ message: 'PROVIDER_UNAVAILABLE', uncertain: true });
  });
});

describe('Instagram OAuth request diagnostics', () => {
  it.each(['code_exchange', 'token_exchange', 'profile', 'publishing_access'] as const)(
    'identifies a rejected %s request without retaining secrets',
    async (operation) => {
      const successful = [
        { access_token: 'short-secret', user_id: '123', permissions: INSTAGRAM_SCOPES },
        { access_token: 'long-secret', expires_in: 5184000 },
        { id: '123', user_id: '123', username: 'private-name', account_type: 'BUSINESS' },
      ];
      const steps = ['code_exchange', 'token_exchange', 'profile', 'publishing_access'];
      const fetcher = vi.fn<typeof fetch>();
      for (const body of successful.slice(0, steps.indexOf(operation)))
        fetcher.mockResolvedValueOnce(Response.json(body));
      fetcher.mockResolvedValueOnce(
        Response.json(
          { error: { code: 100, message: 'private-name long-secret' } },
          { status: 400 },
        ),
      );
      const error = await new InstagramClient(options, fetcher)
        .exchange('private-code')
        .catch((problem: unknown) => problem);
      expect(error).toMatchObject({
        code: 'PROVIDER_REJECTED',
        details: { operation, httpStatus: 400, providerCode: 100 },
      });
      expect(JSON.stringify(error)).not.toMatch(/private-name|long-secret|private-code/);
      expect(fetcher).toHaveBeenCalledTimes(steps.indexOf(operation) + 1);
    },
  );
});
