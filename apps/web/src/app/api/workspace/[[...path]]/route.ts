import type { NextRequest } from 'next/server';
import { proxyApi } from '@/lib/proxy-api';
export const runtime = 'nodejs';
async function proxy(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyApi(request, '/api/workspace', (await context.params).path ?? []);
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
