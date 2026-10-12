import sharp from 'sharp';
import { PHOTO_UPLOAD_BYTES } from '@social-scheduler/shared';
import { WorkspaceError } from './errors.js';
import type { PreparedMedia } from './media-types.js';

const formats: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'heif',
};
function matchesPhotoHeader(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg')
    return bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === 'image/png')
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === 'image/webp')
    return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  return (
    mimeType === 'image/avif' &&
    bytes.toString('ascii', 4, 8) === 'ftyp' &&
    bytes.subarray(8, 64).includes(Buffer.from('avif'))
  );
}
export async function preparePhoto(bytes: Buffer, mimeType: string): Promise<PreparedMedia> {
  if (bytes.length > PHOTO_UPLOAD_BYTES)
    throw new WorkspaceError(413, 'Choose a photo up to 8 MB.');
  try {
    if (!matchesPhotoHeader(bytes, mimeType)) throw new Error('Unsupported photo signature');
    const input = sharp(bytes, { limitInputPixels: 40000000, failOn: 'error' });
    const metadata = await input.metadata();
    if (
      !formats[mimeType] ||
      metadata.format !== formats[mimeType] ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages ?? 1) > 1 ||
      (mimeType === 'image/avif' && metadata.compression !== 'av1')
    )
      throw new Error('Unsupported photo');
    const orientedWidth = (metadata.orientation ?? 1) >= 5 ? metadata.height : metadata.width;
    if (orientedWidth < 320) throw new WorkspaceError(422, 'Use a photo at least 320 px wide.');
    const resized = await input
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize({ width: 1440, height: 1800, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
    const { width, height } = resized.info;
    // Preserve the whole photo. Pad uncommon aspect ratios instead of silently cropping.
    const targetWidth = Math.max(width, Math.ceil(height * 0.8));
    const targetHeight = Math.max(height, Math.ceil(width / 1.91));
    const prepared = await sharp(resized.data)
      .extend({
        left: Math.floor((targetWidth - width) / 2),
        right: Math.ceil((targetWidth - width) / 2),
        top: Math.floor((targetHeight - height) / 2),
        bottom: Math.ceil((targetHeight - height) / 2),
        background: '#ffffff',
      })
      .jpeg({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
    return {
      bytes: prepared.data,
      mimeType: 'image/jpeg',
      type: 'IMAGE',
      extension: 'jpg',
      width: prepared.info.width,
      height: prepared.info.height,
    };
  } catch (error) {
    if (error instanceof WorkspaceError) throw error;
    throw new WorkspaceError(
      422,
      'This photo could not be read. Choose a still JPEG, PNG, WebP, or AVIF.',
    );
  }
}
