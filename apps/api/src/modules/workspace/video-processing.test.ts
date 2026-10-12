import { describe, expect, it } from 'vitest';
import { prepareVideo } from './video-processing.js';
import { VIDEO_UPLOAD_BYTES } from '@social-scheduler/shared';

describe('Video upload trust boundaries', () => {
  it('rejects oversize before starting a decoder', async () => {
    await expect(prepareVideo(Buffer.alloc(VIDEO_UPLOAD_BYTES + 1))).rejects.toMatchObject({
      status: 413,
    });
  });
  it('rejects non-MP4 bytes instead of trusting the request MIME type', async () => {
    await expect(prepareVideo(Buffer.from('not an MP4'))).rejects.toMatchObject({ status: 422 });
  });
});
