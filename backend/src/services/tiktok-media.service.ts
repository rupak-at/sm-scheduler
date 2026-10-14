import sharp from 'sharp';
import { PHOTO_UPLOAD_BYTES, VIDEO_UPLOAD_BYTES } from '@social-scheduler/shared';
import type { WorkspaceServices } from '../types/workspace.types.js';
import { WorkspaceError } from '../lib/workspace-error.js';
import { tiktokMediaAuthorized } from '../integrations/tiktok/media-url.js';
import { downloadProtectedMedia } from '../lib/media/remote-download.js';

let downloads = 0;
export async function readTikTokMedia(
  services: WorkspaceServices,
  publicationId: string,
  mediaId: string,
  expires: number,
  signature: string,
) {
  if (
    !services.tiktok ||
    !tiktokMediaAuthorized(services.tiktok.signingKey, publicationId, mediaId, expires, signature)
  )
    throw new WorkspaceError(403, 'Media link expired.');
  const publication = await services.database.publication.findUnique({
    where: { id: publicationId },
    include: {
      socialAccount: true,
      post: { include: { media: { include: { mediaAsset: true } } } },
    },
  });
  const media = publication?.post.media.find((item) => item.mediaAssetId === mediaId)?.mediaAsset;
  if (
    !publication ||
    !media ||
    publication.socialAccount.provider !== 'TIKTOK' ||
    publication.socialAccount.status !== 'CONNECTED' ||
    !['PROCESSING', 'UNCERTAIN', 'PUBLISHED'].includes(publication.status) ||
    !publication.publishRequestedAt ||
    media.status !== 'READY' ||
    media.userId !== publication.post.userId ||
    publication.socialAccount.userId !== publication.post.userId ||
    !(
      (media.type === 'IMAGE' && media.mimeType === 'image/jpeg') ||
      (media.type === 'VIDEO' && media.mimeType === 'video/mp4')
    )
  )
    throw new WorkspaceError(404, 'Media not found.');
  if (downloads >= 2) throw new WorkspaceError(503, 'Media delivery is busy. Try again shortly.');
  downloads++;
  try {
    const extension = media.type === 'VIDEO' ? 'mp4' : 'jpg';
    const remote = services.storage.previewUrl?.(media.id, extension, media.storageKey);
    const maximum = extension === 'mp4' ? VIDEO_UPLOAD_BYTES : PHOTO_UPLOAD_BYTES;
    const bytes = remote
      ? await downloadProtectedMedia(remote, maximum)
      : await services.storage.read(media.id, extension);
    if (!bytes.length || bytes.length > maximum || BigInt(bytes.length) !== media.sizeBytes)
      throw new WorkspaceError(503, 'Protected media could not be verified.');
    return {
      bytes:
        extension === 'jpg'
          ? await sharp(bytes, { limitInputPixels: 40000000 })
              .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 90 })
              .toBuffer()
          : bytes,
      mimeType: media.mimeType,
    };
  } finally {
    downloads--;
  }
}
