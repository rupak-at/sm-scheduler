import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

export class MediaStorage {
  constructor(
    private readonly directory: string,
    private readonly signingKey: string,
    private readonly publicUrl?: string,
  ) {}
  async put(id: string, bytes: Buffer, extension: 'jpg' | 'mp4' = 'jpg') {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await writeFile(this.path(id, extension), bytes, { flag: 'wx', mode: 0o600 });
  }
  read(id: string, extension: 'jpg' | 'mp4' = 'jpg') {
    return readFile(this.path(id, extension));
  }
  remove(id: string, extension: 'jpg' | 'mp4' = 'jpg') {
    return unlink(this.path(id, extension));
  }
  publicMediaUrl(id: string): string {
    if (!this.publicUrl?.startsWith('https://')) throw new Error('PUBLIC_MEDIA_URL_REQUIRED');
    const expires = Math.floor(Date.now() / 1000) + 86400;
    const url = new URL(`/api/media/public/${id}`, this.publicUrl);
    url.search = new URLSearchParams({
      expires: String(expires),
      signature: this.signature(id, expires),
    }).toString();
    return url.toString();
  }
  authorized(id: string, expires: number, signature: string): boolean {
    if (
      !Number.isInteger(expires) ||
      expires < Date.now() / 1000 ||
      expires > Date.now() / 1000 + 86500
    )
      return false;
    const expected = Buffer.from(this.signature(id, expires));
    const actual = Buffer.from(signature);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
  private signature(id: string, expires: number) {
    return createHmac('sha256', this.signingKey).update(`media:${id}:${expires}`).digest('hex');
  }
  private path(id: string, extension: 'jpg' | 'mp4') {
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Invalid asset identifier');
    if (!['jpg', 'mp4'].includes(extension)) throw new Error('Invalid media extension');
    return join(this.directory, `${id}.${extension}`);
  }
}
