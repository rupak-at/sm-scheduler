import { z } from 'zod';

export class TikTokError extends Error {
  constructor(
    public readonly code: string,
    public readonly uncertain = false,
  ) {
    super(code);
  }
}
const errorSchema = z.union([
  z.object({ error: z.object({ code: z.string() }) }).transform((value) => value.error.code),
  z.object({ error: z.string() }).transform((value) => value.error),
]);
function errorCode(code: string): string {
  if (['access_token_invalid', 'invalid_grant', 'invalid_refresh_token'].includes(code))
    return 'TOKEN_REVOKED';
  if (code === 'scope_not_authorized') return 'PERMISSION_REQUIRED';
  if (code === 'rate_limit_exceeded') return 'RATE_LIMITED';
  if (code === 'internal_error') return 'PROVIDER_UNAVAILABLE';
  if (code === 'url_ownership_unverified') return 'MEDIA_DOMAIN_UNVERIFIED';
  if (code === 'unaudited_client_can_only_post_to_private_accounts')
    return 'PRIVATE_TEST_ACCOUNT_REQUIRED';
  if (
    [
      'spam_risk_too_many_posts',
      'reached_active_user_cap',
      'spam_risk_user_banned_from_posting',
    ].includes(code)
  )
    return 'CREATOR_POSTING_UNAVAILABLE';
  return 'PROVIDER_REJECTED';
}
export function parseTikTokJson(text: string): unknown {
  // TikTok documents int64 post IDs. Node 24's JSON source context avoids rounding them.
  return JSON.parse(text, (_key: string, value: unknown, context?: { source: string }) =>
    typeof value === 'number' && !Number.isSafeInteger(value) && Number.isInteger(value)
      ? (context?.source ?? value)
      : value,
  );
}
export async function tiktokRequest<T>(
  fetcher: typeof fetch,
  path: string,
  init: RequestInit,
  schema: z.ZodType<T>,
  writes = false,
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(new URL(path, 'https://open.tiktokapis.com'), {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new TikTokError('PROVIDER_UNAVAILABLE', writes);
  }
  let body: unknown;
  try {
    body = parseTikTokJson(await response.text());
  } catch {
    throw new TikTokError('INVALID_PROVIDER_RESPONSE', writes);
  }
  const failure = errorSchema.safeParse(body);
  if (!response.ok || (failure.success && failure.data !== 'ok')) {
    const code = failure.success
      ? errorCode(failure.data)
      : response.status === 429
        ? 'RATE_LIMITED'
        : 'PROVIDER_REJECTED';
    throw new TikTokError(
      code,
      writes && (response.status >= 500 || code === 'PROVIDER_UNAVAILABLE'),
    );
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new TikTokError('INVALID_PROVIDER_RESPONSE', writes);
  return result.data;
}
