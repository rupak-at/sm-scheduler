'use client';
import { useRef, useState } from 'react';
import { Upload, LoaderCircle, X } from 'lucide-react';
import { MEDIA_UPLOAD_TYPES } from '@social-scheduler/shared';
import { Button } from '@/components/ui/button';
import type { usePostEditor } from '@/hooks/planner/use-post-editor';

export function MediaField({ editor }: { editor: ReturnType<typeof usePostEditor> }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Photo or video</p>
      <div
        className={`rounded-xl border border-dashed p-6 text-center ${over ? 'border-ink bg-surface' : 'border-input bg-canvas'}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!editor.pending) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          if (!editor.pending) void editor.uploadFiles([...event.dataTransfer.files]);
        }}
      >
        {editor.uploading ? (
          <LoaderCircle
            aria-hidden="true"
            className="mx-auto size-6 text-muted motion-safe:animate-spin"
          />
        ) : (
          <Upload aria-hidden="true" className="mx-auto size-6 text-muted" />
        )}
        <p role="status" className="mt-3 text-sm font-medium">
          {editor.uploading ? 'Uploading and preparing your media…' : 'Drop a photo or MP4 here'}
        </p>
        <p className="mt-1 text-xs text-muted">
          {editor.uploading
            ? 'You can write your caption while we prepare it.'
            : 'Or choose a file from your device.'}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 h-11 w-full sm:h-9 sm:w-auto"
          disabled={editor.pending}
          onClick={() => input.current?.click()}
          aria-describedby="media-help"
        >
          {editor.preview ? 'Replace media' : 'Choose file'}
        </Button>
        <input
          id="media-file"
          name="media"
          ref={input}
          type="file"
          hidden
          aria-label="Choose a photo or MP4 video"
          accept={MEDIA_UPLOAD_TYPES.join(',')}
          disabled={editor.pending}
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = '';
            void editor.uploadFiles(files);
          }}
        />
      </div>
      {editor.preview && <SelectedMedia editor={editor} />}
      <p id="media-help" className="text-xs leading-relaxed text-muted">
        JPEG, PNG, WebP, or AVIF photos up to 8 MB. MP4 videos up to 64 MB, from 3 seconds to 15
        minutes. One photo or Reel per post.
      </p>
    </div>
  );
}

function SelectedMedia({ editor }: { editor: ReturnType<typeof usePostEditor> }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <p role="status" className="min-w-0 text-xs [overflow-wrap:anywhere] text-muted">
        {editor.preview?.name ?? 'Selected media'}
        {editor.asset ? ' · Ready' : ''}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={editor.removeMedia}
        disabled={editor.saving}
        className="h-11 sm:h-8"
      >
        <X aria-hidden="true" />
        Remove media
      </Button>
    </div>
  );
}
