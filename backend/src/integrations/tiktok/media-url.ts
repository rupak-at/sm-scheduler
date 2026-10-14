import { createHmac, timingSafeEqual } from 'node:crypto';

const signature = (key: string, publicationId: string, mediaId: string, expires: number) =>
  createHmac('sha256', key)
    .update(`tiktok-media:${publicationId}:${mediaId}:${expires}`)
    .digest('hex');
export function tiktokMediaUrl(
  origin: string,
  key: string,
  publicationId: string,
  mediaId: string,
): string {
  const base = new URL(origin);
  if (
    base.protocol !== 'https:' ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== '/'
  )
    throw new Error('TIKTOK_MEDIA_ORIGIN_REQUIRED');
  const expires = Math.floor(Date.now() / 1000) + 7200;
  const url = new URL(`/api/media/tiktok/${publicationId}/${mediaId}`, base);
  url.search = new URLSearchParams({
    expires: String(expires),
    signature: signature(key, publicationId, mediaId, expires),
  }).toString();
  return url.toString();
}
export function tiktokMediaAuthorized(
  key: string,
  publicationId: string,
  mediaId: string,
  expires: number,
  proof: string,
): boolean {
  if (
    !Number.isInteger(expires) ||
    expires <= Date.now() / 1000 ||
    expires > Date.now() / 1000 + 7300
  )
    return false;
  const expected = Buffer.from(signature(key, publicationId, mediaId, expires));
  const supplied = Buffer.from(proof);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
