'use client';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { PlannerPost } from '@social-scheduler/shared';
import { workspaceRequest } from '@/lib/planner/workspace-client';
import { useMediaUpload } from '@/hooks/planner/use-media-upload';
import { useEditorSchedule } from '@/hooks/planner/use-editor-schedule';
import { useUnsavedChanges } from '@/hooks/planner/use-unsaved-changes';
import { useCaption } from '@/hooks/planner/use-caption';

export function usePostEditor(post: PlannerPost | undefined, initialChannelId: string) {
  const router = useRouter();
  const original = useRef(post);
  const caption = useCaption(post?.caption ?? '');
  const [channelId, setChannelId] = useState(post?.socialAccountId ?? initialChannelId);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
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
  const media = useMediaUpload(original.current, () => setDirty(true), fail);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (saving || media.uploading) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const scheduling = submitter instanceof HTMLButtonElement && submitter.value === 'schedule';
    try {
      if (!media.asset) throw new Error('Add a photo or video before saving.');
      if (caption.captionProblem) throw new Error(caption.captionProblem);
      if (!channelId) throw new Error('Choose an Instagram account.');
      if (scheduling && !schedule.scheduled)
        throw new Error('Choose a date and time for this post.');
      if (scheduling && new Date(schedule.scheduled).getTime() < Date.now() + 60000)
        throw new Error('Choose a time at least one minute in the future.');
      setSaving(true);
      await workspaceRequest(post ? `/posts/${post.id}` : '/posts', post ? 'PUT' : 'POST', {
        caption: caption.composedCaption,
        mediaAssetId: media.asset.id,
        socialAccountId: channelId,
        timezone: schedule.timezone,
        scheduledAt: scheduling ? new Date(schedule.scheduled).toISOString() : null,
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
