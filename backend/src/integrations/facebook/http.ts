import { z } from 'zod';

export class FacebookError extends Error {
  constructor(
    public readonly code: string,
    public readonly uncertain = false,
  ) {
    super(code);
  }
}
const failure = z.object({ error: z.object({ code: z.number().optional() }) });
export async function facebookRequest<T>(
  fetcher: typeof fetch,
  url: URL,
  init: RequestInit,
  schema: z.ZodType<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new FacebookError('PROVIDER_UNAVAILABLE', init.method === 'POST');
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new FacebookError('INVALID_PROVIDER_RESPONSE', init.method === 'POST');
  }
  if (!response.ok) {
    const parsed = failure.safeParse(body);
    const code = parsed.success ? parsed.data.error.code : undefined;
    throw new FacebookError(
      code === 190
        ? 'TOKEN_REVOKED'
        : code === 10 || code === 200
          ? 'PERMISSION_REQUIRED'
          : response.status === 429 || [4, 17, 32, 613, 80001].includes(code ?? 0)
            ? 'RATE_LIMITED'
            : 'PROVIDER_REJECTED',
      init.method === 'POST' && response.status >= 500,
    );
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new FacebookError('INVALID_PROVIDER_RESPONSE', init.method === 'POST');
  return result.data;
}
