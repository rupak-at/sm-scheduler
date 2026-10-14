import { FacebookError } from './http.js';
import { FACEBOOK_SCOPES } from './schemas.js';
import type { FacebookGrant } from './schemas.js';

export function validateFacebookGrant(
  grant: FacebookGrant,
  appId: string,
  pageId?: string,
): Date | null {
  if (!grant.is_valid) throw new FacebookError('TOKEN_REVOKED');
  if (grant.app_id !== appId || (pageId && (grant.type !== 'PAGE' || grant.profile_id !== pageId)))
    throw new FacebookError('ACCOUNT_MISMATCH');
  if (!pageId && (grant.type !== 'USER' || !grant.user_id))
    throw new FacebookError('ACCOUNT_MISMATCH');
  if (!FACEBOOK_SCOPES.every((scope) => grant.scopes.includes(scope)))
    throw new FacebookError('PERMISSION_REQUIRED');
  if (
    pageId &&
    grant.granular_scopes?.some(
      (scope) =>
        FACEBOOK_SCOPES.includes(scope.scope) &&
        scope.target_ids &&
        !scope.target_ids.includes(pageId),
    )
  )
    throw new FacebookError('PERMISSION_REQUIRED');
  // Zero is Meta's no-expiration sentinel. Data-access expiry still limits access.
  const expiry = [grant.expires_at, grant.data_access_expires_at].filter((value) => value > 0);
  const expiresAt = expiry.length ? new Date(Math.min(...expiry) * 1000) : null;
  if (expiresAt && expiresAt.getTime() <= Date.now()) throw new FacebookError('TOKEN_EXPIRED');
  return expiresAt;
}
