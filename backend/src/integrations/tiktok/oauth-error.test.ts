import { describe, expect, it } from 'vitest';
import { tiktokOAuthFailure } from './oauth-error.js';

describe('TikTok OAuth callback errors', () => {
  it.each([
    ['access_denied', 'AUTHORIZATION_DECLINED'],
    ['invalid_scope', 'OAUTH_INVALID_SCOPE'],
    ['invalid_client', 'OAUTH_APP_CONFIGURATION'],
    ['unauthorized_client', 'OAUTH_APP_CONFIGURATION'],
    ['invalid_request', 'OAUTH_REQUEST_REJECTED'],
    ['invalid_grant', 'OAUTH_REQUEST_REJECTED'],
    ['server_error', 'OAUTH_PROVIDER_UNAVAILABLE'],
    ['temporarily_unavailable', 'OAUTH_PROVIDER_UNAVAILABLE'],
    [undefined, 'OAUTH_FAILED'],
    ['invalid_scope&connection=TIKTOK_connected', 'OAUTH_FAILED'],
  ])('maps %s to a fixed browser-safe category', (providerError, expected) => {
    expect(tiktokOAuthFailure(providerError)).toBe(expected);
  });
});
