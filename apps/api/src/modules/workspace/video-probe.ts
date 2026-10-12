import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import { VIDEO_DURATION_SECONDS, VIDEO_UPLOAD_BYTES } from '@social-scheduler/shared';
import { WorkspaceError } from './errors.js';

const run = promisify(execFile);
const probeSchema = z.object({
  streams: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      codec_type: z.string(),
      codec_name: z.string().optional(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
    }),
  ),
  format: z.object({ format_name: z.string(), duration: z.string() }),
});
export async function probeVideo(path: string) {
  const { stdout } = await run(
    'ffprobe',
    [
      '-v',
      'error',
      '-protocol_whitelist',
      'file,pipe',
      '-show_streams',
      '-show_format',
      '-of',
      'json',
      path,
    ],
    { timeout: 15000, maxBuffer: 2 * 1024 * 1024 },
  );
  const probe = probeSchema.parse(JSON.parse(stdout));
  const video = probe.streams.find((stream) => stream.codec_type === 'video');
  const duration = Number(probe.format.duration);
  if (
    !probe.format.format_name.split(',').includes('mp4') ||
    !video?.width ||
    !video.height ||
    !['h264', 'hevc'].includes(video.codec_name ?? '') ||
    !Number.isFinite(duration) ||
    duration < VIDEO_DURATION_SECONDS.minimum ||
    duration > VIDEO_DURATION_SECONDS.maximum
  )
    throw new WorkspaceError(422, 'Use an H.264 or H.265 MP4, between 3 seconds and 15 minutes.');
  return { width: video.width, height: video.height, streamIndex: video.index, duration };
}
export async function normalizeVideoFile(input: string, output: string, streamIndex: number) {
  await run(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-nostdin',
      '-protocol_whitelist',
      'file,pipe',
      '-i',
      input,
      '-map',
      `0:${streamIndex}`,
      '-map',
      '0:a:0?',
      '-map_metadata',
      '-1',
      '-map_chapters',
      '-1',
      '-t',
      String(VIDEO_DURATION_SECONDS.maximum),
      '-fs',
      String(VIDEO_UPLOAD_BYTES + 1),
      '-vf',
      "scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30",
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-maxrate',
      '20M',
      '-bufsize',
      '20M',
      '-c:a',
      'aac',
      '-ar',
      '48000',
      '-ac',
      '2',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      '-metadata:s:v:0',
      'rotate=0',
      output,
    ],
    { timeout: 120000, maxBuffer: 2 * 1024 * 1024 },
  );
}
