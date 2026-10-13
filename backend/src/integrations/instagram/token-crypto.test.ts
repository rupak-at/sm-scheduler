import { describe, expect, it } from 'vitest';
import { TokenVault } from './token-crypto.js';
import { LocalMediaStorage } from '../../lib/media/local-storage.js';
const key = Buffer.alloc(32, 5).toString('base64');
describe('provider secret and public media boundaries', () => {
  it('encrypts with fresh nonces and authenticates the account and key version', () => {
    const vault = new TokenVault(key);
    const first = vault.seal('private-access-token', '123');
    expect(Buffer.from(first).includes(Buffer.from('private-access-token'))).toBe(false);
    expect(first).not.toEqual(vault.seal('private-access-token', '123'));
    expect(vault.open(first, '123')).toBe('private-access-token');
    expect(() => vault.open(first, '456')).toThrow();
    expect(() => vault.open(first, '123', 2)).toThrow();
    first[first.length - 1] = (first[first.length - 1] ?? 0) ^ 1;
    expect(() => vault.open(first, '123')).toThrow();
  });
  it('bounds media signatures to an asset and expiry and requires HTTPS', () => {
    const storage = new LocalMediaStorage('/tmp/unused', key, 'https://media.example');
    const id = 'ffe4e519-3886-44b2-b39e-0a67194b73e0';
    const url = new URL(storage.publicMediaUrl(id));
    const expires = Number(url.searchParams.get('expires'));
    const signature = url.searchParams.get('signature')!;
    expect(storage.authorized(id, expires, signature)).toBe(true);
    expect(storage.authorized('another-id', expires, signature)).toBe(false);
    expect(storage.authorized(id, 0, signature)).toBe(false);
    expect(storage.authorized(id, expires + 1, signature)).toBe(false);
    expect(() => new LocalMediaStorage('/tmp/unused', key).publicMediaUrl(id)).toThrow();
  });
});
