import { z } from 'zod';

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];
export const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1).optional(),
  refresh_token_expires_in: z.number().int().positive().optional(),
  scope: z.string().optional(),
  token_type: z.string().refine((value) => value.toLowerCase() === 'bearer'),
});
export type YouTubeToken = z.infer<typeof tokenSchema>;
export const bundleSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().min(1),
  scopes: z.array(z.string()),
  refreshExpiresAt: z.iso.datetime().nullable(),
});
export const channelListSchema = z.object({
  nextPageToken: z.string().optional(),
  items: z
    .array(z.object({ id: z.string().min(1), snippet: z.object({ title: z.string() }) }))
    .max(50),
});
export const videoSchema = z.object({
  id: z.string().min(1).max(256),
  snippet: z.object({ channelId: z.string() }),
  status: z.object({
    uploadStatus: z.enum(['uploaded', 'processed', 'failed', 'rejected', 'deleted']),
    privacyStatus: z.enum(['private', 'unlisted', 'public']),
  }),
});
export const videoListSchema = z.object({ items: z.array(videoSchema).max(1) });
export function grantedScopes(value: string | undefined): string[] {
  return value?.split(/\s+/).filter(Boolean) ?? [];
}
