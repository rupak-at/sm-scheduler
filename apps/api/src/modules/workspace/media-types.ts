import type { StoredMediaType } from '@social-scheduler/shared';
import { WorkspaceError } from './errors.js';

export interface PreparedMedia {
  bytes: Buffer;
  mimeType: StoredMediaType;
  type: 'IMAGE' | 'VIDEO';
  extension: 'jpg' | 'mp4';
  width: number;
  height: number;
}
export function mediaExtension(mimeType: string): 'jpg' | 'mp4' {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'video/mp4') return 'mp4';
  throw new WorkspaceError(422, 'This stored media format is not supported.');
}
