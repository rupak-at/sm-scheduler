import { describe, expect, it } from 'vitest';
import { cloudinaryUploadError } from './upload-error.js';

describe('Cloudinary upload failure diagnostics', () => {
  it.each([
    [400, 'upload settings and account limits'],
    [401, 'credentials configured on the API server'],
    [403, 'account permissions and upload restrictions'],
    [413, 'upload size limit'],
    [420, 'limiting uploads'],
    [429, 'limiting uploads'],
    [499, 'timed out'],
    [503, 'temporarily unavailable'],
  ])('retains provider HTTP %i with safe guidance', (http_code, guidance) => {
    const error = cloudinaryUploadError({ http_code, message: 'secret-signed-request' });
    expect(error.status).toBe(503);
    expect(error.message).toContain(`HTTP ${http_code}`);
    expect(error.message).toContain(guidance);
    expect(error.message).not.toContain('secret-signed-request');
  });

  it.each(['ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'CERT_HAS_EXPIRED'])(
    'identifies %s transport failures without exposing hostnames',
    (code) => {
      const error = cloudinaryUploadError({ code, hostname: 'secret-host', message: 'secret' });
      expect(error.message).toContain(`(${code})`);
      expect(error.message).not.toContain('secret');
    },
  );

  it.each([
    undefined,
    null,
    'secret-message',
    { http_code: '401-secret' },
    { http_code: 401.5 },
    { http_code: 999999 },
    { http_code: Number.NaN },
    { code: 'SECRET_SIGNED_URL', message: 'secret' },
  ])('discards malformed and unknown diagnostics: %j', (failure) => {
    expect(cloudinaryUploadError(failure).message).toBe(
      'Cloudinary upload failed without a provider status. Try again.',
    );
  });
});
