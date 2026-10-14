import type { TikTokCreator, TikTokSettings } from '@social-scheduler/shared';
import { TikTokError } from './http.js';

export function validateTikTokSettings(
  settings: TikTokSettings,
  creator: TikTokCreator,
  audited: boolean,
  media: {
    type: string;
    width: number | null;
    height: number | null;
    durationSeconds: number | null;
  },
) {
  if (!settings.consent) throw new TikTokError('CONSENT_REQUIRED');
  if (!settings.privacy || !creator.privacy_level_options.includes(settings.privacy))
    throw new TikTokError('PRIVACY_SELECTION_REQUIRED');
  if (
    !audited &&
    (settings.privacy !== 'SELF_ONLY' ||
      creator.privacy_level_options.includes('PUBLIC_TO_EVERYONE'))
  )
    throw new TikTokError('PRIVATE_TEST_ACCOUNT_REQUIRED');
  if (
    (settings.allowComment && creator.comment_disabled) ||
    (media.type === 'VIDEO' &&
      ((settings.allowDuet && creator.duet_disabled) ||
        (settings.allowStitch && creator.stitch_disabled)))
  )
    throw new TikTokError('INTERACTION_SETTINGS_CHANGED');
  if (
    settings.commercial
      ? !settings.ownBrand && !settings.brandedContent
      : settings.ownBrand || settings.brandedContent
  )
    throw new TikTokError('COMMERCIAL_DISCLOSURE_REQUIRED');
  if (settings.brandedContent && settings.privacy === 'SELF_ONLY')
    throw new TikTokError('BRANDED_CONTENT_CANNOT_BE_PRIVATE');
  if (
    media.type === 'VIDEO' &&
    (!media.width ||
      !media.height ||
      media.width < 360 ||
      media.height < 360 ||
      media.width > 4096 ||
      media.height > 4096 ||
      !media.durationSeconds ||
      media.durationSeconds < 3 ||
      media.durationSeconds > creator.max_video_post_duration_sec)
  )
    throw new TikTokError('VIDEO_EXCEEDS_CREATOR_LIMITS');
  if (media.type === 'IMAGE' && (settings.allowDuet || settings.allowStitch))
    throw new TikTokError('PHOTO_INTERACTIONS_INVALID');
}
