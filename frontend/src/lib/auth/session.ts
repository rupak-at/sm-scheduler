import 'server-only';
import { sessionResponseSchema } from '@social-scheduler/shared';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { apiBaseUrl } from '@/lib/api-server';

export const getSession = cache(async () => {
  const requestHeaders = await headers();
  const response = await fetch(new URL('/api/auth/get-session', apiBaseUrl()), {
    headers: { cookie: requestHeaders.get('cookie') ?? '' },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Could not verify session. Check API availability.');
  return sessionResponseSchema.parse(await response.json());
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session.user;
}
