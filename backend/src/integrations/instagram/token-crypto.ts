import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export class TokenVault {
  private readonly key: Buffer;
  constructor(
    base64Key: string,
    private readonly provider: 'instagram' | 'facebook' = 'instagram',
  ) {
    this.key = Buffer.from(base64Key, 'base64');
    if (this.key.length !== 32) throw new Error('Invalid encryption key');
  }
  seal(token: string, accountId: string): Uint8Array<ArrayBuffer> {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, nonce);
    cipher.setAAD(Buffer.from(`${this.provider}:1:${accountId}`));
    const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return new Uint8Array(Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]));
  }
  open(value: Uint8Array, accountId: string, version = 1): string {
    if (version !== 1 || value.length < 29) throw new Error('Invalid encrypted token');
    const bytes = Buffer.from(value);
    const cipher = createDecipheriv('aes-256-gcm', this.key, bytes.subarray(0, 12));
    cipher.setAAD(Buffer.from(`${this.provider}:1:${accountId}`));
    cipher.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString('utf8');
  }
}
