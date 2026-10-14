'use client';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { PlannerPost, Channel } from '@social-scheduler/shared';
import { workspaceRequest } from '@/lib/planner/workspace-client';
import { useMediaUpload } from '@/hooks/planner/use-media-upload';
import { useEditorSchedule } from '@/hooks/planner/use-editor-schedule';
import { useUnsavedChanges } from '@/hooks/planner/use-unsaved-changes';
import { useCaption } from '@/hooks/planner/use-caption';
import { useTikTokSettings } from '@/hooks/planner/use-tiktok-settings';
import { validateEditorSchedule, scheduleRequested } from '@/lib/planner/post-schedule';

export function usePostEditor(post: PlannerPost | undefined, channels: Channel[]) {
  const router = useRouter();
  const original = useRef(post);
  const caption = useCaption(post?.caption ?? '');
  const [channelId, setChannelId] = useState(post?.socialAccountId ?? channels[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [mediaVersion, setMediaVersion] = useState(0);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  const schedule = useEditorSchedule(original.current?.scheduledAt ?? null);
  useUnsavedChanges(dirty);
  function fail(problem: unknown) {
    setError(
      problem === '' ? '' : problem instanceof Error ? problem.message : 'Could not save the post.',
    );
  }
  const media = useMediaUpload(
    original.current,
    () => {
      setDirty(true);
      setMediaVersion((version) => version + 1);
    },
    fail,
  );
  const tiktok = useTikTokSettings(
    channels.find((channel) => channel.id === channelId)?.provider === 'TIKTOK' ? channelId : null,
    media.preview?.mimeType === 'video/mp4',
    post,
    mediaVersion,
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (saving || media.uploading) return;
    const scheduling = scheduleRequested(event.nativeEvent);
    try {
      if (!media.asset) throw new Error('Add a photo or video before saving.');
      if (caption.captionProblem) throw new Error(caption.captionProblem);
      if (!channelId) throw new Error('Choose an account to publish to.');
      if (scheduling && tiktok.active && tiktok.problem) throw new Error(tiktok.problem);
      validateEditorSchedule(schedule.scheduled, scheduling);
      setSaving(true);
      await workspaceRequest(post ? `/posts/${post.id}` : '/posts', post ? 'PUT' : 'POST', {
        caption: caption.composedCaption,
        mediaAssetId: media.asset.id,
        socialAccountId: channelId,
        timezone: schedule.timezone,
        scheduledAt: scheduling ? new Date(schedule.scheduled).toISOString() : null,
        ...(tiktok.active ? { tiktokSettings: tiktok.settings } : {}),
        ...(post ? { revision: original.current?.updatedAt } : {}),
      });
      setDirty(false);
      router.replace(`/planner?view=${scheduling ? 'scheduled' : 'drafts'}`);
      router.refresh();
    } catch (problem) {
      fail(problem);
    } finally {
      setSaving(false);
    }
  }
  return {
    ...media,
    ...schedule,
    ...caption,
    tiktok,
    channelId,
    setChannelId,
    pending: saving || media.uploading,
    saving,
    dirty,
    setDirty,
    error,
    errorRef,
    submit,
  };
}
