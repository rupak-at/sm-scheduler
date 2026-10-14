import { z } from 'zod';
import { tiktokCreatorSchema } from '@social-scheduler/shared';

export const TIKTOK_SCOPES = ['user.info.basic', 'video.publish'];
export const tokenSchema = z.object({
  open_id: z.string().min(1),
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_expires_in: z.number().int().positive(),
  scope: z.string(),
  token_type: z.literal('Bearer'),
});
export type TikTokToken = z.infer<typeof tokenSchema>;
export const bundleSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  refreshExpiresAt: z.iso.datetime(),
  scopes: z.array(z.string()),
});
export const envelope = <T>(schema: z.ZodType<T>) =>
  z
    .object({ data: schema, error: z.object({ code: z.literal('ok') }) })
    .transform((value) => value.data);
export const creatorSchema = envelope(tiktokCreatorSchema);
export const profileSchema = envelope(
  z.object({ user: z.object({ open_id: z.string().min(1), display_name: z.string() }) }),
).transform((value) => value.user);
export const publishSchema = envelope(z.object({ publish_id: z.string().min(1).max(256) }));
const postId = z.union([
  z.string().regex(/^\d+$/),
  z.number().int().nonnegative().safe().transform(String),
]);
export const statusSchema = envelope(
  z.object({
    status: z.enum([
      'PROCESSING_UPLOAD',
      'PROCESSING_DOWNLOAD',
      'SEND_TO_USER_INBOX',
      'PUBLISH_COMPLETE',
      'FAILED',
    ]),
    publicaly_available_post_id: z.array(postId).optional(),
  }),
);
