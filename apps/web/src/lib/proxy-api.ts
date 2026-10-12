import type { NextRequest } from 'next/server';
import { apiBaseUrl } from './api-server';
import { PHOTO_UPLOAD_BYTES, VIDEO_UPLOAD_BYTES } from '@social-scheduler/shared';
import { readBoundedBody, RequestBodyLimitError } from './request-body';

export async function proxyApi(request: NextRequest, prefix: string, path: string[]) {
  const target = new URL(`${prefix}/${path.map(encodeURIComponent).join('/')}`, apiBaseUrl());
  target.search = request.nextUrl.search;
  const headers = new Headers();
  for (const name of ['content-type', 'cookie', 'origin', 'user-agent', 'range']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const upload = prefix === '/api/workspace' && path[0] === 'media' && request.method === 'POST';
    const limit = upload
      ? headers.get('content-type')?.split(';')[0] === 'video/mp4'
        ? VIDEO_UPLOAD_BYTES
        : PHOTO_UPLOAD_BYTES
      : 100 * 1024;
    const body = ['POST', 'PUT'].includes(request.method)
      ? await readBoundedBody(request, limit)
      : undefined;
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      ...(body ? { body } : {}),
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(upload ? 180000 : 90000),
    });
    const responseHeaders = new Headers({
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
    });
    for (const name of [
      'retry-after',
      'x-content-type-options',
      'content-range',
      'content-length',
      'accept-ranges',
    ]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    if (error instanceof RequestBodyLimitError)
      return Response.json(
        { error: 'Photos can be up to 8 MB; MP4 videos can be up to 64 MB.' },
        { status: 413 },
      );
    return Response.json(
      { error: 'Workspace is temporarily unavailable. Try again shortly.' },
      { status: 503 },
    );
  }
}
