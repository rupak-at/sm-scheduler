import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { usePostEditor } from '../hooks/use-post-editor';
export function PhotoField({ editor }: { editor: ReturnType<typeof usePostEditor> }) {
  return (
    <div className="space-y-3">
      {editor.asset ? (
        <Image
          src={editor.asset.url}
          width={200}
          height={240}
          alt="Photo selected for this post"
          unoptimized
          className="max-h-60 w-full rounded-lg bg-surface object-contain"
        />
      ) : (
        <div className="grid min-h-36 place-items-center rounded-lg border border-dashed border-input px-5 text-center text-sm text-muted">
          Your photo goes here
        </div>
      )}
      <Label htmlFor="photo">JPEG photo</Label>
      <Input
        id="photo"
        name="photo"
        type="file"
        accept="image/jpeg"
        className="text-xs"
        disabled={editor.pending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void editor.upload(file);
        }}
        aria-describedby="photo-help"
      />
      <p id="photo-help" className="text-xs leading-relaxed text-muted">
        Up to 8 MB. At least 320 px wide. Portrait 4:5 through landscape 1.91:1.
      </p>
    </div>
  );
}
