import { useEffect, useState } from 'react';
import { tiktokCreatorResponseSchema, tiktokSettingsSchema } from '@social-scheduler/shared';
import type { TikTokSettings, PlannerPost } from '@social-scheduler/shared';
import type { z } from 'zod';
import { workspaceRequest } from '@/lib/planner/workspace-client';
import { tiktokSchedulingProblem } from '@/lib/planner/tiktok-settings';

type CreatorResponse = z.infer<typeof tiktokCreatorResponseSchema>;
export function useTikTokSettings(
  accountId: string | null,
  video: boolean,
  post?: PlannerPost,
  mediaVersion = 0,
) {
  const [selection, setSelection] = useState(() => ({
    accountId: post?.socialAccountId,
    mediaVersion: 0,
    settings: tiktokSettingsSchema.parse({ ...post?.tiktokSettings, consent: false }),
  }));
  const [response, setResponse] = useState<{
    id: string;
    data?: CreatorResponse;
    error?: string;
  }>();
  useEffect(() => {
    if (!accountId) return;
    setResponse(undefined);
    let disposed = false;
    void workspaceRequest<unknown>(`/channels/${accountId}/tiktok/creator`, 'GET')
      .then((value) => {
        if (!disposed)
          setResponse({ id: accountId, data: tiktokCreatorResponseSchema.parse(value) });
      })
      .catch((error: unknown) => {
        if (!disposed)
          setResponse({
            id: accountId,
            error: error instanceof Error ? error.message : 'Could not load TikTok settings.',
          });
      });
    return () => {
      disposed = true;
    };
  }, [accountId]);
  const settings =
    selection.accountId === accountId
      ? {
          ...selection.settings,
          consent: selection.mediaVersion === mediaVersion && selection.settings.consent,
        }
      : tiktokSettingsSchema.parse({});
  const current = response?.id === accountId ? response : undefined;
  const creator = current?.data?.creator;
  const audited = current?.data?.audited ?? false;
  function update(patch: Partial<TikTokSettings>) {
    setSelection((previous) => ({
      accountId: accountId ?? undefined,
      mediaVersion,
      settings: {
        ...(previous.accountId === accountId ? previous.settings : tiktokSettingsSchema.parse({})),
        ...patch,
        consent: 'consent' in patch ? Boolean(patch.consent) : false,
        ...(!video ? { allowDuet: false, allowStitch: false } : {}),
      },
    }));
  }
  const problem = accountId
    ? tiktokSchedulingProblem({ creator, audited, settings, video, error: current?.error })
    : '';
  return {
    active: Boolean(accountId),
    settings,
    update,
    creator,
    audited,
    problem,
  };
}
