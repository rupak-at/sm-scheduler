import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { VIDEO_UPLOAD_BYTES } from '@social-scheduler/shared';
import { WorkspaceError } from '../workspace-error.js';
import type { PreparedMedia } from './media-types.js';
import { probeVideo, normalizeVideoFile } from './video-probe.js';

let processing = 0;
export async function prepareVideo(bytes: Buffer): Promise<PreparedMedia> {
  if (bytes.length > VIDEO_UPLOAD_BYTES)
    throw new WorkspaceError(413, 'Choose an MP4 up to 64 MB.');
  if (bytes.subarray(4, 8).toString('ascii') !== 'ftyp')
    throw new WorkspaceError(422, 'Choose a valid MP4 video.');
  if (processing >= 2)
    throw new WorkspaceError(429, 'Video processing is busy. Try again shortly.');
  processing++;
  let directory: string | undefined;
  try {
    directory = await mkdtemp(join(tmpdir(), 'social-scheduler-video-'));
    const input = join(directory, 'input.mp4'),
      output = join(directory, 'output.mp4');
    await writeFile(input, bytes, { mode: 0o600 });
    const probe = await probeVideo(input);
    await normalizeVideoFile(input, output, probe.streamIndex);
    const normalized = await readFile(output);
    if (normalized.length > VIDEO_UPLOAD_BYTES)
      throw new WorkspaceError(
        422,
        'The prepared video exceeds 64 MB. Export a shorter or smaller MP4.',
      );
    const dimensions = await probeVideo(output);
    if (Math.abs(dimensions.duration - probe.duration) > 0.15)
      throw new WorkspaceError(
        422,
        'The prepared video was incomplete. Export a shorter or smaller MP4.',
      );
    return {
      bytes: normalized,
      width: dimensions.width,
      height: dimensions.height,
      durationSeconds: dimensions.duration,
      mimeType: 'video/mp4',
      type: 'VIDEO',
      extension: 'mp4',
    };
  } catch (error) {
    if (error instanceof WorkspaceError) throw error;
    if (typeof error === 'object' && error && 'code' in error && error.code === 'ENOENT')
      throw new WorkspaceError(
        503,
        'Video processing is temporarily unavailable. Try again shortly.',
      );
    throw new WorkspaceError(
      422,
      'This video could not be prepared. Export an H.264 MP4 and try again.',
    );
  } finally {
    processing--;
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}
