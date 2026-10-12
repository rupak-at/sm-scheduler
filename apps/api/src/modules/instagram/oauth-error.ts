import { InstagramError } from '@social-scheduler/publishing';

export function callbackFailureUrl(
  webOrigin: string,
  destination: '/login' | '/planner',
  error: unknown,
): string {
  const url = new URL(destination, webOrigin);
  url.searchParams.set(
    'connection',
    error instanceof InstagramError ? error.code : 'CONNECTION_FAILED',
  );
  if (error instanceof InstagramError) {
    const { operation, httpStatus, providerCode, providerSubcode } = error.details;
    if (operation) url.searchParams.set('step', operation);
    // Only numeric diagnostics and our own operation names leave the backend. Provider
    // messages, bodies, request URLs, authorization codes, and tokens must stay private.
    for (const [name, value] of [
      ['http_status', httpStatus],
      ['provider_code', providerCode],
      ['provider_subcode', providerSubcode],
    ] as const) {
      if (value !== undefined && Number.isSafeInteger(value))
        url.searchParams.set(name, String(value));
    }
  }
  return url.toString();
}
