import { z } from 'zod';

export const tiktokPrivacySchema = z.enum([
  'PUBLIC_TO_EVERYONE',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWER_OF_CREATOR',
  'SELF_ONLY',
]);
export const tiktokSettingsSchema = z.object({
  privacy: tiktokPrivacySchema.nullable().default(null),
  allowComment: z.boolean().default(false),
  allowDuet: z.boolean().default(false),
  allowStitch: z.boolean().default(false),
  commercial: z.boolean().default(false),
  ownBrand: z.boolean().default(false),
  brandedContent: z.boolean().default(false),
  aiGenerated: z.boolean().default(false),
  autoAddMusic: z.boolean().default(false),
  photoTitle: z.string().max(90).default(''),
  consent: z.boolean().default(false),
});
export type TikTokSettings = z.infer<typeof tiktokSettingsSchema>;
export const tiktokCreatorSchema = z.object({
  creator_username: z.string(),
  creator_nickname: z.string(),
  privacy_level_options: z.array(tiktokPrivacySchema),
  comment_disabled: z.boolean(),
  duet_disabled: z.boolean(),
  stitch_disabled: z.boolean(),
  max_video_post_duration_sec: z.number().int().positive(),
});
export type TikTokCreator = z.infer<typeof tiktokCreatorSchema>;
export const tiktokCreatorResponseSchema = z.object({
  creator: tiktokCreatorSchema,
  audited: z.boolean(),
});
