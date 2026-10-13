import { createHmac, timingSafeEqual } from 'node:crypto';

const lifetime = 600;
export function createUploadToken(key: string, id: string, now = Date.now()): string {
  const expires = Math.floor(now / 1000) + lifetime;
  return `${expires}.${signature(key, id, expires)}`;
}
export function validUploadToken(
  key: string,
  id: string,
  token: string,
  now = Date.now(),
): boolean {
  const [timestamp, supplied, extra] = token.split('.');
  const expires = Number(timestamp);
  if (
    extra ||
    !supplied ||
    !Number.isSafeInteger(expires) ||
    expires <= now / 1000 ||
    expires > now / 1000 + lifetime
  )
    return false;
  const expected = Buffer.from(signature(key, id, expires));
  const actual = Buffer.from(supplied);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function signature(key: string, id: string, expires: number): string {
  return createHmac('sha256', key).update(`media-upload:${id}:${expires}`).digest('base64url');
}
