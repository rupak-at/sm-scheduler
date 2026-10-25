import { z } from 'zod';

export const youtubeSettingsSchema = z.object({
  title: z
    .string()
    .max(100)
    .regex(/^[^<>]*$/)
    .default(''),
  privacy: z.enum(['private', 'unlisted', 'public']).nullable().default(null),
  madeForKids: z.boolean().nullable().default(null),
  containsSyntheticMedia: z.boolean().default(false),
  paidPromotion: z.boolean().default(false),
  notifySubscribers: z.boolean().default(false),
  consent: z.boolean().default(false),
});
export type YouTubeSettings = z.infer<typeof youtubeSettingsSchema>;

export function youtubeSchedulingProblem(settings: YouTubeSettings, caption: string): string {
  if (!settings.title.trim()) return 'Add a YouTube video title.';
  if (!settings.privacy) return 'Choose YouTube visibility.';
  if (settings.madeForKids === null) return 'Choose whether this video is made for kids.';
  if (/[<>]/.test(caption)) return 'YouTube descriptions cannot contain angle brackets.';
  if (new TextEncoder().encode(caption).length > 5000)
    return 'The YouTube description exceeds 5,000 UTF-8 bytes.';
  if (!settings.consent) return 'Review the YouTube settings and confirm publishing consent.';
  return '';
}
