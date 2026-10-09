import { useState } from 'react';
import type { PlannerPost } from '@social-scheduler/shared';
export function useMediaUpload(
  post: PlannerPost | undefined,
  dirty: () => void,
  fail: (error: unknown) => void,
) {
  const [asset, setAsset] = useState(post ? { id: post.mediaAssetId, url: post.mediaUrl } : null);
  const [uploading, setUploading] = useState(false);
  async function upload(file: File) {
    fail('');
    setUploading(true);
    try {
      if (file.type !== 'image/jpeg' || file.size > 8 * 1024 * 1024)
        throw new Error('Choose a JPEG photo smaller than 8 MB.');
      const response = await fetch('/api/workspace/media', {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: file,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Photo upload failed. Try again.');
      setAsset({ id: result.id, url: result.url });
      dirty();
    } catch (error) {
      fail(error);
    } finally {
      setUploading(false);
    }
  }
  return { asset, uploading, upload };
}
