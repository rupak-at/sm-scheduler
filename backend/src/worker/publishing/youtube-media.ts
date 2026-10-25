import { VIDEO_UPLOAD_BYTES } from '@social-scheduler/shared';
import type { MediaStorage } from '../../lib/media/media-storage.types.js';
import { downloadProtectedMedia } from '../../lib/media/remote-download.js';
import { YouTubeError } from '../../integrations/youtube/http.js';
import type { ClaimedPublication } from './claim.js';

let downloads = 0;
export async function readYouTubeVideo(
  storage: MediaStorage,
  media: ClaimedPublication['post']['media'][number]['mediaAsset'],
): Promise<Buffer> {
  if (downloads >= 2) throw new YouTubeError('RATE_LIMITED');
  downloads++;
  try {
    const remote = storage.previewUrl?.(media.id, 'mp4', media.storageKey);
    const bytes = remote
      ? await downloadProtectedMedia(remote, VIDEO_UPLOAD_BYTES)
      : await storage.read(media.id, 'mp4');
    if (
      !bytes.length ||
      bytes.length > VIDEO_UPLOAD_BYTES ||
      BigInt(bytes.length) !== media.sizeBytes ||
      bytes.toString('ascii', 4, 8) !== 'ftyp'
    )
      throw new YouTubeError('INVALID_PUBLICATION_MEDIA');
    return bytes;
  } finally {
    downloads--;
  }
}
