import type { TikTokCreator, TikTokSettings } from '@social-scheduler/shared';

export function tiktokSchedulingProblem({
  creator,
  audited,
  settings,
  video,
  error,
}: {
  creator: TikTokCreator | undefined;
  audited: boolean;
  settings: TikTokSettings;
  video: boolean;
  error: string | undefined;
}): string {
  if (error) return error;
  if (!creator) return 'Loading your current TikTok posting options…';
  if (!audited && creator.privacy_level_options.includes('PUBLIC_TO_EVERYONE'))
    return 'TikTok testing requires a private account until this app passes its Direct Post audit.';
  if (!settings.privacy || !creator.privacy_level_options.includes(settings.privacy))
    return 'Choose who can view this TikTok post.';
  if (!audited && settings.privacy !== 'SELF_ONLY')
    return 'This app can currently post only with Only me visibility.';
  if (settings.commercial && !settings.ownBrand && !settings.brandedContent)
    return 'Choose Your brand, Branded content, or both.';
  if (settings.brandedContent && settings.privacy === 'SELF_ONLY')
    return 'Branded content cannot use Only me visibility.';
  if (
    (settings.allowComment && creator.comment_disabled) ||
    (video &&
      ((settings.allowDuet && creator.duet_disabled) ||
        (settings.allowStitch && creator.stitch_disabled)))
  )
    return 'Your TikTok interaction permissions changed. Review them before scheduling.';
  if (!settings.consent)
    return 'Confirm that this post may be sent to TikTok at its scheduled time.';
  return '';
}
