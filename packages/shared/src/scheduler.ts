import { z } from 'zod';
import { storedMediaTypeSchema } from './media.js';
import { tiktokSettingsSchema } from './tiktok.js';

export const postInputSchema = z.object({
  caption: z.string().max(2200),
  mediaAssetId: z.uuid(),
  socialAccountId: z.uuid(),
  tiktokSettings: tiktokSettingsSchema.optional(),
  scheduledAt: z.iso.datetime({ offset: true }).nullable(),
  timezone: z
    .string()
    .max(80)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, 'Choose an IANA timezone'),
});
export type PostInput = z.infer<typeof postInputSchema>;
export const channelSchema = z.object({
  id: z.uuid(),
  provider: z.enum(['INSTAGRAM', 'FACEBOOK', 'TIKTOK']).default('INSTAGRAM'),
  displayName: z.string().nullable(),
  status: z.enum(['CONNECTED', 'EXPIRED', 'REVOKED', 'DISCONNECTED']),
  tokenExpiresAt: z.string().nullable(),
  tokenCheckedAt: z.string().nullable(),
});
export type Channel = z.infer<typeof channelSchema>;
export const postSchema = z.object({
  id: z.uuid(),
  editable: z.boolean().default(true),
  caption: z.string(),
  updatedAt: z.string(),
  mediaAssetId: z.uuid(),
  mediaUrl: z.string(),
  mediaMimeType: storedMediaTypeSchema.default('image/jpeg'),
  mediaDurationSeconds: z.number().positive().nullable().default(null),
  tiktokSettings: tiktokSettingsSchema.optional(),
  publicationId: z.uuid(),
  socialAccountId: z.uuid(),
  status: z.enum([
    'DRAFT',
    'SCHEDULED',
    'PROCESSING',
    'PUBLISHED',
    'FAILED',
    'CANCELLED',
    'UNCERTAIN',
  ]),
  scheduledAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  timezone: z.string(),
  externalPostId: z.string().nullable(),
  attempts: z.array(
    z.object({ number: z.number(), status: z.string(), error: z.string().nullable() }),
  ),
});
export type PlannerPost = z.infer<typeof postSchema>;
export const workspaceCountsSchema = z.object({
  all: z.number().int().nonnegative(),
  drafts: z.number().int().nonnegative(),
  scheduled: z.number().int().nonnegative(),
  published: z.number().int().nonnegative(),
  attention: z.number().int().nonnegative(),
});
export type WorkspaceCounts = z.infer<typeof workspaceCountsSchema>;
export const workspaceSchema = z.object({
  instagramConfigured: z.boolean(),
  facebookConfigured: z.boolean().default(false),
  tiktokConfigured: z.boolean().default(false),
  channels: z.array(channelSchema),
  posts: z.array(postSchema),
  nextCursor: z.string().nullable(),
  counts: workspaceCountsSchema,
  upcoming: z.array(postSchema).max(3),
});
// Keep the deployed queue name so pending Instagram jobs survive the Facebook rollout.
export const PUBLISH_QUEUE = 'instagram-publishing';
