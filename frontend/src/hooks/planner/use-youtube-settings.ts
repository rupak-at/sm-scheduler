import { useState } from 'react';
import { youtubeSettingsSchema, youtubeSchedulingProblem } from '@social-scheduler/shared';
import type { YouTubeSettings, PlannerPost } from '@social-scheduler/shared';

export function useYouTubeSettings(
  accountId: string | null,
  caption: string,
  video: boolean,
  post?: PlannerPost,
  mediaVersion = 0,
) {
  const [selection, setSelection] = useState(() => ({
    accountId: post?.socialAccountId,
    mediaVersion: 0,
    settings: youtubeSettingsSchema.parse({ ...post?.youtubeSettings, consent: false }),
  }));
  const settings =
    selection.accountId === accountId
      ? {
          ...selection.settings,
          consent: selection.mediaVersion === mediaVersion && selection.settings.consent,
        }
      : youtubeSettingsSchema.parse({});
  function update(patch: Partial<YouTubeSettings>) {
    setSelection((previous) => ({
      accountId: accountId ?? undefined,
      mediaVersion,
      settings: {
        ...(previous.accountId === accountId ? previous.settings : youtubeSettingsSchema.parse({})),
        ...patch,
        consent: 'consent' in patch ? Boolean(patch.consent) : false,
      },
    }));
  }
  return {
    active: Boolean(accountId),
    settings,
    update,
    problem: accountId
      ? !video
        ? 'YouTube requires an MP4 video.'
        : youtubeSchedulingProblem(settings, caption)
      : '',
  };
}
