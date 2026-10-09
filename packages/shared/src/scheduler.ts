import { z } from 'zod';

export const postInputSchema = z.object({
  caption: z.string().max(2200),
  mediaAssetId: z.uuid(),
  socialAccountId: z.uuid(),
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
  displayName: z.string().nullable(),
  status: z.enum(['CONNECTED', 'EXPIRED', 'REVOKED', 'DISCONNECTED']),
  tokenExpiresAt: z.string().nullable(),
  tokenCheckedAt: z.string().nullable(),
});
export type Channel = z.infer<typeof channelSchema>;
export const postSchema = z.object({
  id: z.uuid(),
  caption: z.string(),
  updatedAt: z.string(),
  mediaAssetId: z.uuid(),
  mediaUrl: z.string(),
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
export const workspaceSchema = z.object({
  instagramConfigured: z.boolean(),
  channels: z.array(channelSchema),
  posts: z.array(postSchema),
  nextCursor: z.string().nullable(),
});
export const PUBLISH_QUEUE = 'instagram-publishing';
