import { describe, expect, it } from 'vitest';
import { createUploadToken, validUploadToken } from './upload-token.js';

describe('scoped upload authorization', () => {
  it('binds the signature to a media ID, key, purpose, and expiry', () => {
    const now = 1700000000000;
    const token = createUploadToken('test-key', 'media-id', now);
    expect(validUploadToken('test-key', 'media-id', token, now)).toBe(true);
    expect(validUploadToken('test-key', 'other-id', token, now)).toBe(false);
    expect(validUploadToken('other-key', 'media-id', token, now)).toBe(false);
    expect(validUploadToken('test-key', 'media-id', token, now + 600000)).toBe(false);
    expect(validUploadToken('test-key', 'media-id', token, now - 1000)).toBe(false);
  });
  it('rejects malformed signatures without timing-safe comparison errors', () => {
    for (const token of [
      '',
      'not-a-token',
      'Infinity.sig',
      '1700000600.x.extra',
      '1700000600.short',
    ])
      expect(validUploadToken('test-key', 'media-id', token, 1700000000000)).toBe(false);
  });
});
