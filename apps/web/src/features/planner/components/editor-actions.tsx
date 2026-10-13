import { CalendarClock, FilePenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { usePostEditor } from '../hooks/use-post-editor';
export function EditorActions({ editor }: { editor: ReturnType<typeof usePostEditor> }) {
  const label = editor.uploading ? 'Preparing media…' : editor.saving ? 'Saving…' : null;
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-line bg-paper px-[max(20px,env(safe-area-inset-left),env(safe-area-inset-right))] py-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-[max(28px,env(safe-area-inset-left),env(safe-area-inset-right))]">
      <p className="mr-auto hidden text-xs text-muted sm:block">
        Save an idea. Schedule when you’re ready.
      </p>
      <Button
        form="post-form"
        type="submit"
        name="intent"
        value="draft"
        variant="outline"
        disabled={editor.pending}
        className="h-11 flex-1 rounded-xl sm:flex-none"
      >
        <FilePenLine aria-hidden="true" />
        {label ?? 'Save draft'}
      </Button>
      <Button
        form="post-form"
        type="submit"
        name="intent"
        value="schedule"
        disabled={editor.pending}
        className="h-11 flex-1 rounded-xl sm:flex-none"
      >
        <CalendarClock aria-hidden="true" />
        {label ?? 'Schedule post'}
      </Button>
    </div>
  );
}
