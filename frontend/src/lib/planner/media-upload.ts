import { z } from 'zod';
import {
  MEDIA_UPLOAD_TYPES,
  PHOTO_UPLOAD_BYTES,
  VIDEO_UPLOAD_BYTES,
  mediaUploadSchema,
} from '@social-scheduler/shared';

const extensions: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  mp4: 'video/mp4',
};
export function uploadContentType(file: File): string {
  const type = file.type || extensions[file.name.split('.').at(-1)?.toLowerCase() ?? ''];
  if (!type || !MEDIA_UPLOAD_TYPES.some((allowed) => allowed === type))
    throw new Error('Choose a JPEG, PNG, WebP, AVIF photo, or an MP4 video.');
  const limit = type === 'video/mp4' ? VIDEO_UPLOAD_BYTES : PHOTO_UPLOAD_BYTES;
  if (!file.size || file.size > limit)
    throw new Error(
      type === 'video/mp4' ? 'Choose an MP4 up to 64 MB.' : 'Choose a photo up to 8 MB.',
    );
  return type;
}
export async function transferMedia(file: File, signal: AbortSignal) {
  const response = await fetch('/api/workspace/media', {
    method: 'POST',
    headers: { 'Content-Type': uploadContentType(file) },
    body: file,
    signal: AbortSignal.any([signal, AbortSignal.timeout(180000)]),
  });
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error('Media upload failed. Try again shortly.');
  }
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(result);
    throw new Error(error.success ? error.data.error : 'Media upload failed. Try again.');
  }
  const media = mediaUploadSchema.safeParse(result);
  if (!media.success) throw new Error('The upload could not be confirmed. Try again.');
  return media.data;
}
