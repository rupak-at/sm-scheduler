import type { NextRequest } from 'next/server';
import { apiBaseUrl } from './api-server';

export async function proxyApi(request: NextRequest, prefix: string, path: string[]) {
  const target = new URL(`${prefix}/${path.map(encodeURIComponent).join('/')}`, apiBaseUrl());
  target.search = request.nextUrl.search;
  const headers = new Headers();
  for (const name of ['content-type', 'cookie', 'origin', 'user-agent']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const body = ['POST', 'PUT'].includes(request.method) ? await request.arrayBuffer() : undefined;
    if (body && body.byteLength > 8 * 1024 * 1024)
      return Response.json({ error: 'Upload a photo smaller than 8 MB.' }, { status: 413 });
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      ...(body ? { body } : {}),
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(90000),
    });
    const responseHeaders = new Headers({
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
    });
    for (const name of ['retry-after', 'x-content-type-options']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json(
      { error: 'Workspace is temporarily unavailable. Try again shortly.' },
      { status: 503 },
    );
  }
}
