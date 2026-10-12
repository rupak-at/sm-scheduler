import Image from 'next/image';
import { Image as ImageIcon, Instagram } from 'lucide-react';
import type { Channel } from '@social-scheduler/shared';
import type { usePostEditor } from '../hooks/use-post-editor';

export function PostPreview({
  editor,
  channel,
}: {
  editor: ReturnType<typeof usePostEditor>;
  channel: Channel | undefined;
}) {
  const media = editor.preview;
  const name = channel?.displayName ? `@${channel.displayName}` : 'Selected Instagram account';
  return (
    <aside
      className="min-w-0 space-y-3 xl:sticky xl:top-6 xl:self-start"
      aria-labelledby="preview-heading"
    >
      <h3 id="preview-heading" className="text-sm font-medium">
        Live preview
      </h3>
      <div className="overflow-hidden rounded-xl border border-line bg-paper">
        <div className="flex items-center gap-3 border-b border-line p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface">
            <Instagram aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-xs text-muted">
              {media?.mimeType === 'video/mp4' ? 'Instagram Reel' : 'Instagram photo'}
            </p>
          </div>
        </div>
        {media ? (
          media.mimeType === 'video/mp4' ? (
            <video
              key={media.url}
              controls
              playsInline
              preload="metadata"
              aria-label="Preview your selected video"
              className="max-h-[520px] w-full bg-ink object-contain"
              src={media.url}
            />
          ) : (
            <Image
              src={media.url}
              width={media.width ?? 1200}
              height={media.height ?? 1200}
              alt="Preview of the photo selected for this post"
              unoptimized
              className="max-h-[520px] w-full object-contain"
            />
          )
        ) : (
          <div className="grid min-h-64 place-content-center gap-3 bg-canvas p-8 text-center text-sm text-muted">
            <ImageIcon aria-hidden="true" className="mx-auto size-8" />
            <p>Your photo or video appears here.</p>
          </div>
        )}
        <div className="border-t border-line p-4">
          {editor.composedCaption ? (
            <p className="text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
              <span className="font-medium">{name}</span>{' '}
              {editor.composedCaption.split(/(#[\p{L}\p{M}\p{N}_]+)/u).map((part, index) => (
                <span key={index} className={part.startsWith('#') ? 'font-medium' : undefined}>
                  {part}
                </span>
              ))}
            </p>
          ) : (
            <p className="text-sm text-muted">Your caption and hashtags appear here as you type.</p>
          )}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        A composition preview. Instagram may crop the cover or format text differently.
        {media?.mimeType === 'image/jpeg' &&
          ' Your full photo is kept; narrow or wide photos may have a white border.'}
      </p>
    </aside>
  );
}
