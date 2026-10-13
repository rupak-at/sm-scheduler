import { describe, expect, it } from 'vitest';
import { InstagramError } from '../http.js';
import { callbackFailureUrl } from './oauth-error.js';

describe('OAuth callback failure redirects', () => {
  it('identifies the failing request using only safe diagnostic fields', () => {
    const error = new InstagramError('PROVIDER_REJECTED', false, {
      operation: 'code_exchange',
      httpStatus: 400,
      providerCode: 100,
      providerSubcode: 33,
    });
    const url = new URL(callbackFailureUrl('https://web.example', '/login', error));
    expect(Object.fromEntries(url.searchParams)).toEqual({
      connection: 'PROVIDER_REJECTED',
      step: 'code_exchange',
      http_status: '400',
      provider_code: '100',
      provider_subcode: '33',
    });
    expect(url.origin).toBe('https://web.example');
    expect(url.pathname).toBe('/login');
  });

  it('retains workspace routing and rejects unsafe numeric values', () => {
    const error = new InstagramError('PROVIDER_REJECTED', false, {
      providerCode: Number.NaN,
      providerSubcode: Number.POSITIVE_INFINITY,
    });
    expect(callbackFailureUrl('https://web.example', '/planner', error)).toBe(
      'https://web.example/planner?connection=PROVIDER_REJECTED',
    );
  });

  it('does not expose unexpected exception messages or OAuth state', () => {
    expect(callbackFailureUrl('https://web.example', '/login', new Error('private-token'))).toBe(
      'https://web.example/login?connection=CONNECTION_FAILED',
    );
    expect(
      callbackFailureUrl(
        'https://web.example',
        '/login',
        new InstagramError('INVALID_OAUTH_STATE'),
      ),
    ).toBe('https://web.example/login?connection=INVALID_OAUTH_STATE');
  });
});
