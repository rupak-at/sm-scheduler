import { redirect } from 'next/navigation';
import { AuthScreen } from '@/components/auth/auth-screen';
import { getSession } from '@/lib/auth/session';

export const metadata = { title: 'Log in | Social Scheduler' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ connection?: string }>;
}) {
  if (await getSession()) redirect('/planner');
  return (
    <AuthScreen
      mode="login"
      {...((await searchParams).connection ? { connection: (await searchParams).connection! } : {})}
    />
  );
}
