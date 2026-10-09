import 'server-only';
import { headers } from 'next/headers';
import { workspaceSchema } from '@social-scheduler/shared';
import { apiBaseUrl } from '@/lib/api-server';

export async function getWorkspace(query: string) {
  const response = await fetch(`${apiBaseUrl()}/api/workspace?${query}`, {
    headers: { cookie: (await headers()).get('cookie') ?? '' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error('Could not load your workspace. Check API availability and migrations.');
  return workspaceSchema.parse(await response.json());
}
