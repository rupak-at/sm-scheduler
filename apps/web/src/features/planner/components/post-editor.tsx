'use client';
import { useRouter } from 'next/navigation';
import { EditorHeader } from './editor-header';
import { EditorActions } from './editor-actions';
import { MediaField } from './media-field';
import { CaptionFields } from './caption-fields';
import { PostPreview } from './post-preview';
import { PostFields } from './post-fields';
import type { Channel, PlannerPost } from '@social-scheduler/shared';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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
  const router = useRouter();
  const editor = usePostEditor(post, channels[0]?.id ?? '');
  function close() {
    if (editor.saving) return;
    if (editor.dirty && !window.confirm('Leave without saving this post?')) return;
    router.replace(closeHref, { scroll: false });
  }
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <SheetContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById('editor-heading')?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document.querySelector<HTMLElement>('[data-new-post]')?.focus();
        }}
      >
        <EditorHeader editing={Boolean(post)} pending={editor.saving} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[max(20px,env(safe-area-inset-left),env(safe-area-inset-right))] py-6 sm:px-[max(28px,env(safe-area-inset-left),env(safe-area-inset-right))]">
          <form
            id="post-form"
            onSubmit={editor.submit}
            onChange={() => editor.setDirty(true)}
            className="grid gap-7 min-[860px]:grid-cols-[minmax(0,1fr)_300px]"
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
                className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive empty:hidden"
              >
                {editor.error}
              </p>
            </fieldset>
            <PostPreview
              editor={editor}
              channel={channels.find((channel) => channel.id === editor.channelId)}
            />
          </form>
        </div>
        <EditorActions editor={editor} />
      </SheetContent>
    </Sheet>
  );
}
