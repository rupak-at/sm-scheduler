import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const run = promisify(execFile);
export async function fixtureVideo(duration = 3, size = '320x568'): Promise<Buffer> {
  const directory = await mkdtemp('/tmp/social-scheduler-test-video-');
  try {
    const path = join(directory, 'test.mp4');
    await run(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'lavfi',
        '-i',
        `testsrc2=size=${size}:rate=30`,
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:sample_rate=44100',
        '-t',
        String(duration),
        '-c:v',
        'libx264',
        '-threads',
        '1',
        '-preset',
        'ultrafast',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '96k',
        '-metadata',
        'title=private-source-title',
        '-movflags',
        '+faststart',
        path,
      ],
      { timeout: 15000, maxBuffer: 1024 * 1024 },
    );
    return await readFile(path);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
