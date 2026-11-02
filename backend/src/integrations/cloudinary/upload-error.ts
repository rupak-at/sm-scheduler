import { WorkspaceError } from '../../lib/workspace-error.js';

const networkCodes = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'EPIPE',
  'CERT_HAS_EXPIRED',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
]);

// Provider messages can contain signed request parameters. Only expose bounded status
// numbers and known transport codes; never interpolate messages, bodies or URLs.
export function cloudinaryUploadError(error: unknown): WorkspaceError {
  if (typeof error !== 'object' || error === null)
    return new WorkspaceError(
      503,
      'Cloudinary upload failed without a provider status. Try again.',
    );
  const status = 'http_code' in error ? error.http_code : undefined;
  if (typeof status === 'number' && Number.isInteger(status) && status >= 400 && status <= 599) {
    let guidance = 'Check Cloudinary upload settings and account limits.';
    if (status === 401) guidance = 'Check the Cloudinary credentials configured on the API server.';
    if (status === 403) guidance = 'Check Cloudinary account permissions and upload restrictions.';
    if (status === 413) guidance = 'The prepared file exceeds the Cloudinary upload size limit.';
    if (status === 420 || status === 429)
      guidance = 'Cloudinary is limiting uploads. Try again later.';
    if (status === 499) guidance = 'The upload timed out. Try again on a stable connection.';
    if (status >= 500) guidance = 'Cloudinary is temporarily unavailable. Try again shortly.';
    return new WorkspaceError(503, `Cloudinary upload failed (HTTP ${status}). ${guidance}`);
  }
  const code = 'code' in error ? error.code : undefined;
  if (typeof code === 'string' && networkCodes.has(code))
    return new WorkspaceError(
      503,
      `Cloudinary upload connection failed (${code}). Check the API server's network connection.`,
    );
  return new WorkspaceError(503, 'Cloudinary upload failed without a provider status. Try again.');
}
