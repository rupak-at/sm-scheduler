import { useEffect, useState } from 'react';
import type { StoredMediaType } from '@social-scheduler/shared';

export interface MediaPreview {
  url: string;
  mimeType: StoredMediaType;
  name?: string;
  width?: number;
  height?: number;
}
export function useMediaPreview(initial: MediaPreview | null) {
  const [preview, setPreview] = useState(initial);
  useEffect(() => {
    const url = preview?.url;
    return () => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    };
  }, [preview?.url]);
  return { preview, setPreview };
}
