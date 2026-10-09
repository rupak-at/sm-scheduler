import { z } from 'zod';

const errorSchema = z.object({ error: z.object({ code: z.number().optional() }) });
export class InstagramError extends Error {
  constructor(
    public readonly code: string,
    public readonly uncertain = false,
  ) {
    super(code);
  }
}
export async function instagramRequest<T>(
  fetcher: typeof fetch,
  url: URL | string,
  init: RequestInit,
  schema: z.ZodType<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new InstagramError('PROVIDER_UNAVAILABLE', init.method === 'POST');
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new InstagramError('INVALID_PROVIDER_RESPONSE', init.method === 'POST');
  }
  if (!response.ok) {
    const parsed = errorSchema.safeParse(body);
    const code = parsed.success ? parsed.data.error.code : undefined;
    throw new InstagramError(
      code === 190
        ? 'TOKEN_REVOKED'
        : code === 10 || code === 200
          ? 'PERMISSION_REQUIRED'
          : response.status === 429
            ? 'RATE_LIMITED'
            : 'PROVIDER_REJECTED',
      init.method === 'POST' && response.status >= 500,
    );
  }
  const result = schema.safeParse(body);
  if (!result.success)
    throw new InstagramError('INVALID_PROVIDER_RESPONSE', init.method === 'POST');
  return result.data;
}
