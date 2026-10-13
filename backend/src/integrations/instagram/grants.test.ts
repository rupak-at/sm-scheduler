import { describe, expect, it, vi } from 'vitest';
import { InstagramClient, INSTAGRAM_SCOPES } from './client.js';

const options = {
  appId: '123',
  appSecret: 'test-app-secret',
  version: 'v25.0',
  redirectUri: 'https://web.example/api/auth/instagram/callback',
};
describe('Grants returned by Instagram Login code exchange', () => {
  it.each([INSTAGRAM_SCOPES.join(', '), [...INSTAGRAM_SCOPES, INSTAGRAM_SCOPES[0]]])(
    'normalizes provider grants without assuming the requested scopes were granted',
    async (permissions) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          Response.json({ access_token: 'short', user_id: '123', permissions }),
        )
        .mockResolvedValueOnce(Response.json({ access_token: 'long', expires_in: 5184000 }))
        .mockResolvedValueOnce(
          Response.json({ id: '123', username: 'creator', account_type: 'MEDIA_CREATOR' }),
        )
        .mockResolvedValueOnce(Response.json({ data: [{ quota_usage: 0 }] }));
      const result = await new InstagramClient(options, fetcher).exchange('authorization-code');
      expect(result.scopes).toEqual(INSTAGRAM_SCOPES);
    },
  );

  it.each(['', INSTAGRAM_SCOPES[0], [INSTAGRAM_SCOPES[0]]])(
    'rejects incomplete grants before extending or storing a token',
    async (permissions) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          Response.json({ access_token: 'short', user_id: '123', permissions }),
        );
      await expect(new InstagramClient(options, fetcher).exchange('code')).rejects.toMatchObject({
        code: 'PERMISSION_REQUIRED',
        details: { operation: 'permissions' },
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it.each([undefined, { invalid: 'private-token' }, ['instagram_business_basic', 42]])(
    'rejects missing or malformed grants instead of guessing',
    async (permissions) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          Response.json({ access_token: 'short', user_id: '123', permissions }),
        );
      await expect(new InstagramClient(options, fetcher).exchange('code')).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE',
        details: { operation: 'code_exchange' },
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
});
