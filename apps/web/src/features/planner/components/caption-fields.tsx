import { Label } from '@/components/ui/label';
import type { usePostEditor } from '../hooks/use-post-editor';

export function CaptionFields({ editor }: { editor: ReturnType<typeof usePostEditor> }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="caption">Caption</Label>
        <textarea
          id="caption"
          name="caption"
          value={editor.caption}
          onChange={(event) => editor.setCaption(event.target.value)}
          maxLength={2200}
          rows={6}
          autoComplete="off"
          placeholder="Share the story behind your post…"
          className="w-full resize-y rounded-lg border border-input bg-paper px-3 py-3 text-base leading-relaxed focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          aria-describedby="caption-help post-editor-error"
          aria-invalid={Boolean(editor.error && editor.captionProblem)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hashtags">Hashtags</Label>
        <textarea
          id="hashtags"
          name="hashtags"
          value={editor.hashtags}
          onChange={(event) => editor.setHashtags(event.target.value)}
          maxLength={2200}
          rows={2}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="#travel #photography…"
          className="w-full resize-y rounded-lg border border-input bg-paper px-3 py-3 text-base focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          aria-describedby="hashtags-help caption-help post-editor-error"
          aria-invalid={Boolean(editor.error && editor.captionProblem)}
        />
        <p id="hashtags-help" className="text-xs text-muted">
          Separate tags with spaces. They’re added below your caption.
        </p>
      </div>
      <p
        id="caption-help"
        className={`text-right text-xs tabular-nums ${editor.composedCaption.length > 2200 ? 'text-destructive' : 'text-muted'}`}
      >
        {editor.composedCaption.length.toLocaleString('en')} / 2,200 characters, including hashtags
      </p>
    </div>
  );
}
