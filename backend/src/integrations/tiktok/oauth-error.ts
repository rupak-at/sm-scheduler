// TikTok callback values are untrusted. Only fixed categories reach the browser.
export function tiktokOAuthFailure(error: string | undefined): string {
  switch (error) {
    case 'access_denied':
      return 'AUTHORIZATION_DECLINED';
    case 'invalid_scope':
      return 'OAUTH_INVALID_SCOPE';
    case 'invalid_client':
    case 'unauthorized_client':
      return 'OAUTH_APP_CONFIGURATION';
    case 'invalid_request':
    case 'invalid_grant':
    case 'unsupported_grant_type':
    case 'unsupported_response_type':
      return 'OAUTH_REQUEST_REJECTED';
    case 'server_error':
    case 'temporarily_unavailable':
      return 'OAUTH_PROVIDER_UNAVAILABLE';
    default:
      return 'OAUTH_FAILED';
  }
}
