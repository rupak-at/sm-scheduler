import { apiBaseUrl } from '@/lib/api-server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

async function proxyAuth(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = new URL(`/api/auth/${path.map(encodeURIComponent).join('/')}`, apiBaseUrl());
  target.search = request.nextUrl.search;
  const headers = new Headers();
  for (const name of ['content-type', 'cookie', 'origin', 'user-agent']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      ...(request.method === 'POST' ? { body: await request.text() } : {}),
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    const responseHeaders = new Headers({
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
    });
    for (const cookie of upstream.headers.getSetCookie())
      responseHeaders.append('Set-Cookie', cookie);
    for (const name of ['location', 'x-retry-after', 'retry-after']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json(
      { message: 'Authentication is temporarily unavailable. Try again shortly.' },
      { status: 503 },
    );
  }
}

export const GET = proxyAuth;
export const POST = proxyAuth;
