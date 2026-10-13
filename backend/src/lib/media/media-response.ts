import type { Request, Response } from 'express';
import { WorkspaceError } from '../workspace-error.js';

export function byteRange(range: string, length: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return null;
  const suffix = match[1] === '';
  const start = suffix ? Math.max(0, length - Number(match[2])) : Number(match[1]);
  const end = suffix || !match[2] ? length - 1 : Math.min(Number(match[2]), length - 1);
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= length ||
    end < start ||
    (suffix && Number(match[2]) <= 0)
  )
    return null;
  return { start, end };
}
export function sendMedia(request: Request, response: Response, bytes: Buffer, mimeType: string) {
  if (!['image/jpeg', 'video/mp4'].includes(mimeType))
    throw new WorkspaceError(404, 'Media not found.');
  response
    .set({ 'Cache-Control': 'private, max-age=300', 'Accept-Ranges': 'bytes' })
    .type(mimeType);
  const rangeHeader = request.headers.range;
  if (rangeHeader) {
    const range = byteRange(rangeHeader, bytes.length);
    if (!range) {
      response.status(416).set('Content-Range', `bytes */${bytes.length}`).end();
      return;
    }
    const body = bytes.subarray(range.start, range.end + 1);
    response
      .status(206)
      .set({
        'Content-Range': `bytes ${range.start}-${range.end}/${bytes.length}`,
        'Content-Length': String(body.length),
      })
      .send(body);
    return;
  }
  response.set('Content-Length', String(bytes.length)).send(bytes);
}
