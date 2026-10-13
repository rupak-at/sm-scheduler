import type { NextRequest } from 'next/server';
import { proxyApi } from '@/lib/proxy-api';
export const runtime = 'nodejs';
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyApi(request, '/api/media', (await context.params).path);
}
