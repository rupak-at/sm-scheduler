import { redirect } from 'next/navigation';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { getSession } from '@/features/auth/lib/session';

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
