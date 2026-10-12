'use client';
import { EditorHeader } from './editor-header';
import { MediaField } from './media-field';
import { CaptionFields } from './caption-fields';
import { PostPreview } from './post-preview';
import { PostFields } from './post-fields';
import type { Channel, PlannerPost } from '@social-scheduler/shared';
import { Button } from '@/components/ui/button';
import { usePostEditor } from '../hooks/use-post-editor';

export function PostEditor({
  channels,
  post,
  closeHref,
}: {
  channels: Channel[];
  post?: PlannerPost;
  closeHref: string;
}) {
  const editor = usePostEditor(post, channels[0]?.id ?? '');
  return (
    <section
      className="mb-6 rounded-xl border border-line bg-paper p-5 sm:p-6"
      aria-labelledby="editor-heading"
    >
      <EditorHeader editing={Boolean(post)} closeHref={closeHref} />
      <form
        onSubmit={editor.submit}
        onChange={() => editor.setDirty(true)}
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]"
        aria-busy={editor.pending}
      >
        <fieldset disabled={editor.saving} className="min-w-0 space-y-6">
          <legend className="sr-only">Post details</legend>
          <MediaField editor={editor} />
          <CaptionFields editor={editor} />
          <PostFields editor={editor} channels={channels} />
          <p
            ref={editor.errorRef}
            id="post-editor-error"
            tabIndex={-1}
            role="alert"
            className="text-sm text-destructive empty:hidden"
          >
            {editor.error}
          </p>
        </fieldset>
        <PostPreview
          editor={editor}
          channel={channels.find((channel) => channel.id === editor.channelId)}
        />
        <div className="flex flex-wrap gap-3 border-t border-line pt-5 xl:col-span-2">
          <Button
            type="submit"
            name="intent"
            value="draft"
            variant="outline"
            disabled={editor.pending}
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            {editor.uploading ? 'Preparing media…' : editor.saving ? 'Saving…' : 'Save draft'}
          </Button>
          <Button
            type="submit"
            name="intent"
            value="schedule"
            disabled={editor.pending}
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            {editor.uploading ? 'Preparing media…' : editor.saving ? 'Saving…' : 'Schedule post'}
          </Button>
        </div>
      </form>
    </section>
  );
}
