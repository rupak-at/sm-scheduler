import type { z } from 'zod';

export class YouTubeError extends Error {
  constructor(
    public readonly code: string,
    public readonly uncertain = false,
  ) {
    super(code);
  }
}

export async function youtubeResponse(
  fetcher: typeof fetch,
  url: URL | string,
  init: RequestInit,
  writes = false,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      redirect: 'manual',
      signal: AbortSignal.timeout(init.body instanceof Uint8Array ? 90000 : 15000),
    });
  } catch {
    throw new YouTubeError('PROVIDER_UNAVAILABLE', writes);
  }
  if (response.ok || response.status === 308) return response;
  let body = '';
  try {
    body = await response.text();
  } catch {
    /* Status remains authoritative. */
  }
  // Only known codes leave the adapter; provider messages and request URLs never do.
  const code =
    response.status === 401 || /"invalid_grant"/.test(body)
      ? 'TOKEN_REVOKED'
      : response.status === 429 ||
          /"(?:quotaExceeded|dailyLimitExceeded|uploadLimitExceeded|rateLimitExceeded)"/.test(body)
        ? 'RATE_LIMITED'
        : response.status === 403
          ? 'PERMISSION_REQUIRED'
          : response.status === 404 || response.status === 410
            ? 'REMOTE_NOT_FOUND'
            : response.status >= 500
              ? 'PROVIDER_UNAVAILABLE'
              : 'PROVIDER_REJECTED';
  throw new YouTubeError(code, writes && response.status >= 500);
}

export async function youtubeJson<T>(
  response: Response,
  schema: z.ZodType<T>,
  writes = false,
): Promise<T> {
  try {
    return schema.parse(await response.json());
  } catch {
    throw new YouTubeError('INVALID_PROVIDER_RESPONSE', writes);
  }
}
