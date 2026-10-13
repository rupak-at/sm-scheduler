import { X, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetClose, SheetDescription, SheetTitle } from '@/components/ui/sheet';
export function EditorHeader({ editing, pending }: { editing: boolean; pending: boolean }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-[max(20px,env(safe-area-inset-left),env(safe-area-inset-right))] py-4 pt-[max(16px,env(safe-area-inset-top))] sm:px-[max(28px,env(safe-area-inset-left),env(safe-area-inset-right))]">
      <div className="flex items-center gap-3">
        <span className="hidden size-10 place-items-center rounded-xl bg-surface sm:grid">
          <ImagePlus className="size-5" strokeWidth={1.6} aria-hidden="true" />
        </span>
        <div>
          <SheetTitle
            id="editor-heading"
            tabIndex={-1}
            className="text-lg font-semibold tracking-tight"
          >
            {editing ? 'Edit your post' : 'Create a post'}
          </SheetTitle>
          <SheetDescription className="mt-0.5 text-xs text-muted">
            A little preparation. A great next post.
          </SheetDescription>
        </div>
      </div>
      <SheetClose asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 rounded-full text-muted"
          disabled={pending}
          aria-label="Close editor"
        >
          <X aria-hidden="true" />
        </Button>
      </SheetClose>
    </div>
  );
}
