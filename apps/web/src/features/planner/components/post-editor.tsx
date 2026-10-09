'use client';
import Link from 'next/link';
import { PhotoField } from './photo-field';
import { PostFields } from './post-fields';
import type { Channel, PlannerPost } from '@social-scheduler/shared';
import { Button } from '@/components/ui/button';
import { usePostEditor } from '../hooks/use-post-editor';

export function PostEditor({ channels, post }: { channels: Channel[]; post?: PlannerPost }) {
  const editor = usePostEditor(post);
  return (
    <section
      className="mb-6 rounded-xl border border-line bg-paper p-5 sm:p-6"
      aria-labelledby="editor-heading"
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 id="editor-heading" className="text-lg font-medium">
          {post ? 'Edit your post' : 'Create a photo post'}
        </h2>
        <Link href="/planner" className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface">
          Close editor
        </Link>
      </div>
      <form
        onSubmit={editor.submit}
        onChange={() => editor.setDirty(true)}
        className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]"
        aria-busy={editor.pending}
      >
        <PhotoField editor={editor} />
        <div className="min-w-0 space-y-4">
          <PostFields editor={editor} channels={channels} {...(post ? { post } : {})} />
          <p
            ref={editor.errorRef}
            tabIndex={-1}
            role="alert"
            className="text-sm text-destructive empty:hidden"
          >
            {editor.error}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              name="intent"
              value="draft"
              variant="outline"
              disabled={editor.pending}
            >
              {editor.pending ? 'Saving…' : 'Save draft'}
            </Button>
            <Button type="submit" name="intent" value="schedule" disabled={editor.pending}>
              {editor.pending ? 'Saving…' : 'Schedule post'}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
