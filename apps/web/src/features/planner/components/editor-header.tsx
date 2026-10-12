import Link from 'next/link';

export function EditorHeader({ editing, closeHref }: { editing: boolean; closeHref: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h2 id="editor-heading" className="text-lg font-medium">
        {editing ? 'Edit your post' : 'Create a post'}
      </h2>
      <Link href={closeHref} className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface">
        Close editor
      </Link>
    </div>
  );
}
