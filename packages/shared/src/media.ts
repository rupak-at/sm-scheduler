import { z } from 'zod';

export const PHOTO_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export const MEDIA_UPLOAD_TYPES = [...PHOTO_UPLOAD_TYPES, 'video/mp4'] as const;
export const PHOTO_UPLOAD_BYTES = 8 * 1024 * 1024;
export const VIDEO_UPLOAD_BYTES = 64 * 1024 * 1024;
export const VIDEO_DURATION_SECONDS = { minimum: 3, maximum: 900 } as const;
export const storedMediaTypeSchema = z.enum(['image/jpeg', 'video/mp4']);
export type StoredMediaType = z.infer<typeof storedMediaTypeSchema>;
export const mediaUploadSchema = z.object({
  id: z.uuid(),
  url: z.string(),
  mimeType: storedMediaTypeSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type UploadedMedia = z.infer<typeof mediaUploadSchema>;
