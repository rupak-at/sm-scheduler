import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { instagramRequest } from './http.js';

const schema = z.object({ id: z.string() });
const url = 'https://graph.instagram.com/me?access_token=private-token';

describe('Safe Instagram failure diagnostics', () => {
  it.each([
    { error: { code: 100, error_subcode: 33, message: 'private-token private-identity' } },
    { code: 100, error_subcode: 33, error_message: 'private-token private-identity' },
  ])('keeps only numeric details from supported error envelopes', async (body) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status: 400 }));
    const error = await instagramRequest(fetcher, url, {}, schema, 'profile').catch(
      (problem: unknown) => problem,
    );
    expect(error).toMatchObject({
      code: 'PROVIDER_REJECTED',
      uncertain: false,
      details: { operation: 'profile', httpStatus: 400, providerCode: 100, providerSubcode: 33 },
    });
    expect(JSON.stringify(error)).not.toMatch(/private-token|private-identity|access_token/);
  });

  it('discards invalid diagnostic fields and retains ambiguous write behavior', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ error: { code: 'private-token', error_subcode: {} } }, { status: 503 }),
      );
    const error = await instagramRequest(
      fetcher,
      url,
      { method: 'POST' },
      schema,
      'code_exchange',
    ).catch((problem: unknown) => problem);
    expect(error).toMatchObject({
      code: 'PROVIDER_REJECTED',
      uncertain: true,
      details: { operation: 'code_exchange', httpStatus: 503, providerCode: undefined },
    });
    expect(JSON.stringify(error)).not.toContain('private-token');
  });
});

describe('Instagram diagnostic error categories', () => {
  it.each([
    [400, 190, 'TOKEN_REVOKED'],
    [400, 10, 'PERMISSION_REQUIRED'],
    [403, 200, 'PERMISSION_REQUIRED'],
    [429, 4, 'RATE_LIMITED'],
  ] as const)('preserves category for HTTP %i / Meta %i', async (status, code, category) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ error: { code } }, { status }));
    await expect(instagramRequest(fetcher, url, {}, schema, 'permissions')).rejects.toMatchObject({
      code: category,
      details: { operation: 'permissions', httpStatus: status, providerCode: code },
    });
  });

  it('annotates network and invalid response failures without retaining raw errors', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValueOnce(new Error('private-token'));
    await expect(
      instagramRequest(fetcher, url, {}, schema, 'token_exchange'),
    ).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      details: { operation: 'token_exchange' },
    });
    fetcher.mockResolvedValueOnce(new Response('private-token', { status: 502 }));
    await expect(instagramRequest(fetcher, url, {}, schema, 'profile')).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE',
      details: { operation: 'profile', httpStatus: 502 },
    });
    fetcher.mockResolvedValueOnce(Response.json({ username: 'private-identity' }));
    await expect(instagramRequest(fetcher, url, {}, schema, 'profile')).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE',
      details: { operation: 'profile', httpStatus: 200 },
    });
  });
});
