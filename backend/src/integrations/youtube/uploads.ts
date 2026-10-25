import { z } from 'zod';
import type { YouTubeSettings } from '@social-scheduler/shared';
import { youtubeJson, youtubeResponse, YouTubeError } from './http.js';

export function youtubeSessionUrl(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'www.googleapis.com' ||
    (url.port && url.port !== '443') ||
    url.username ||
    url.password ||
    url.hash ||
    url.pathname !== '/upload/youtube/v3/videos' ||
    !url.searchParams.get('upload_id')
  )
    throw new YouTubeError('INVALID_UPLOAD_SESSION');
  return url;
}
const uploadedSchema = z.object({ id: z.string().min(1).max(256) });
export class YouTubeUploads {
  constructor(private readonly fetcher = fetch) {}
  async start(
    token: string,
    size: number,
    description: string,
    settings: YouTubeSettings,
  ): Promise<string> {
    const url = new URL('https://www.googleapis.com/upload/youtube/v3/videos');
    url.search = new URLSearchParams({
      uploadType: 'resumable',
      part: 'snippet,status,paidProductPlacementDetails',
      notifySubscribers: String(settings.notifySubscribers),
    }).toString();
    const response = await youtubeResponse(
      this.fetcher,
      url,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': String(size),
          'X-Upload-Content-Type': 'video/mp4',
        },
        body: JSON.stringify({
          snippet: { title: settings.title.trim(), description, categoryId: '22' },
          status: {
            privacyStatus: settings.privacy,
            selfDeclaredMadeForKids: settings.madeForKids,
            containsSyntheticMedia: settings.containsSyntheticMedia,
          },
          paidProductPlacementDetails: { hasPaidProductPlacement: settings.paidPromotion },
        }),
      },
      true,
    );
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location) throw new YouTubeError('INVALID_UPLOAD_SESSION', true);
    return youtubeSessionUrl(location).toString();
  }
  async status(
    token: string,
    session: string,
    size: number,
  ): Promise<{ id: string } | { offset: number }> {
    const response = await youtubeResponse(this.fetcher, youtubeSessionUrl(session), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Length': '0',
        'Content-Range': `bytes */${size}`,
      },
    });
    return this.result(response, size);
  }
  async send(token: string, session: string, bytes: Buffer, offset: number) {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset >= bytes.length)
      throw new YouTubeError('INVALID_UPLOAD_OFFSET');
    const response = await youtubeResponse(
      this.fetcher,
      youtubeSessionUrl(session),
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'video/mp4',
          'Content-Length': String(bytes.length - offset),
          'Content-Range': `bytes ${offset}-${bytes.length - 1}/${bytes.length}`,
        },
        body: new Uint8Array(bytes.subarray(offset)),
      },
      true,
    );
    return this.result(response, bytes.length);
  }
  private async result(
    response: Response,
    size: number,
  ): Promise<{ id: string } | { offset: number }> {
    if (response.status !== 308) return youtubeJson(response, uploadedSchema, true);
    const range = response.headers.get('range');
    await response.body?.cancel();
    if (!range) return { offset: 0 };
    const parsed = /^bytes=0-(\d+)$/.exec(range);
    const offset = parsed ? Number(parsed[1]) + 1 : Number.NaN;
    if (!Number.isSafeInteger(offset) || offset <= 0 || offset >= size)
      throw new YouTubeError('INVALID_UPLOAD_OFFSET', true);
    return { offset };
  }
}
