'use client';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { PlannerPost } from '@social-scheduler/shared';
import { workspaceRequest } from '../lib/workspace-client';
import { useMediaUpload } from './use-media-upload';
import { useEditorSchedule } from './use-editor-schedule';
import { useUnsavedChanges } from './use-unsaved-changes';

export function usePostEditor(post?: PlannerPost) {
  const router = useRouter();
  const original = useRef(post);
  const [caption, setCaption] = useState(post?.caption ?? '');
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
    const form = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const scheduling = submitter instanceof HTMLButtonElement && submitter.value === 'schedule';
    try {
      if (!media.asset) throw new Error('Add a photo before saving.');
      if (scheduling && !schedule.scheduled)
        throw new Error('Choose a date and time for this post.');
      if (scheduling && new Date(schedule.scheduled).getTime() < Date.now() + 60000)
        throw new Error('Choose a time at least one minute in the future.');
      setSaving(true);
      await workspaceRequest(post ? `/posts/${post.id}` : '/posts', post ? 'PUT' : 'POST', {
        caption,
        mediaAssetId: media.asset.id,
        socialAccountId: form.get('channel'),
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
    caption,
    setCaption,
    pending: saving || media.uploading,
    dirty,
    setDirty,
    error,
    errorRef,
    submit,
  };
}
