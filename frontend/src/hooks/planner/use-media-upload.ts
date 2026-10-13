import { useEffect, useRef, useState } from 'react';
import type { PlannerPost, StoredMediaType } from '@social-scheduler/shared';
import { transferMedia, uploadContentType } from '@/lib/planner/media-upload';
import { useMediaPreview } from '@/hooks/planner/use-media-preview';

type EditorAsset = {
  id: string;
  url: string;
  mimeType: StoredMediaType;
  width?: number;
  height?: number;
};
export function useMediaUpload(
  post: PlannerPost | undefined,
  dirty: () => void,
  fail: (error: unknown) => void,
) {
  const initial: EditorAsset | null = post
    ? { id: post.mediaAssetId, url: post.mediaUrl, mimeType: post.mediaMimeType }
    : null;
  const [asset, setAsset] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const { preview, setPreview } = useMediaPreview(initial);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      sequence.current++;
      controller.current?.abort();
    },
    [],
  );
  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    if (files.length !== 1) {
      fail(new Error('Choose one photo or video for this post.'));
      return;
    }
    const file = files[0]!;
    const previous = asset;
    const current = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    fail('');
    try {
      const type = uploadContentType(file);
      setPreview({
        url: URL.createObjectURL(file),
        mimeType: type === 'video/mp4' ? 'video/mp4' : 'image/jpeg',
        name: file.name,
      });
      setAsset(null);
      setUploading(true);
      dirty();
      const media = await transferMedia(file, abort.signal);
      if (sequence.current !== current) return;
      setAsset(media);
      setPreview({ ...media, name: file.name });
    } catch (error) {
      if (sequence.current !== current) return;
      setAsset(previous);
      setPreview(previous);
      fail(
        error instanceof DOMException && error.name === 'TimeoutError'
          ? new Error('The upload took too long. Try a smaller file or retry shortly.')
          : error,
      );
    } finally {
      if (sequence.current === current) setUploading(false);
    }
  }
  function removeMedia() {
    sequence.current++;
    controller.current?.abort();
    setAsset(null);
    setPreview(null);
    setUploading(false);
    fail('');
    dirty();
  }
  return { asset, preview, uploading, uploadFiles, removeMedia };
}
