import { z } from 'zod';

const errorDetailsSchema = z.object({
  code: z.number().int().optional(),
  error_subcode: z.number().int().optional(),
});
const errorSchema = z.union([z.object({ error: errorDetailsSchema }), errorDetailsSchema]);
export type InstagramOperation = 'code_exchange' | 'token_exchange' | 'profile' | 'permissions';
export interface InstagramErrorDetails {
  operation?: InstagramOperation | undefined;
  httpStatus?: number | undefined;
  providerCode?: number | undefined;
  providerSubcode?: number | undefined;
}
export class InstagramError extends Error {
  constructor(
    public readonly code: string,
    public readonly uncertain = false,
    public readonly details: InstagramErrorDetails = {},
  ) {
    super(code);
  }
}
export async function instagramRequest<T>(
  fetcher: typeof fetch,
  url: URL | string,
  init: RequestInit,
  schema: z.ZodType<T>,
  operation?: InstagramOperation,
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new InstagramError('PROVIDER_UNAVAILABLE', init.method === 'POST', { operation });
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new InstagramError('INVALID_PROVIDER_RESPONSE', init.method === 'POST', {
      operation,
      httpStatus: response.status,
    });
  }
  if (!response.ok) {
    const parsed = errorSchema.safeParse(body);
    const provider = parsed.success
      ? 'error' in parsed.data
        ? parsed.data.error
        : parsed.data
      : undefined;
    const code = provider?.code;
    throw new InstagramError(
      code === 190
        ? 'TOKEN_REVOKED'
        : code === 10 || code === 200
          ? 'PERMISSION_REQUIRED'
          : response.status === 429
            ? 'RATE_LIMITED'
            : 'PROVIDER_REJECTED',
      init.method === 'POST' && response.status >= 500,
      {
        operation,
        httpStatus: response.status,
        providerCode: code,
        providerSubcode: provider?.error_subcode,
      },
    );
  }
  const result = schema.safeParse(body);
  if (!result.success)
    throw new InstagramError('INVALID_PROVIDER_RESPONSE', init.method === 'POST', {
      operation,
      httpStatus: response.status,
    });
  return result.data;
}
