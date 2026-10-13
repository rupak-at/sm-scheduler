import { redirect } from 'next/navigation';
import { AuthScreen } from '@/components/auth/auth-screen';
import { getSession } from '@/lib/auth/session';

export const metadata = { title: 'Create account | Social Scheduler' };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ connection?: string }>;
}) {
  if (await getSession()) redirect('/planner');
  return (
    <AuthScreen
      mode="signup"
      {...((await searchParams).connection ? { connection: (await searchParams).connection! } : {})}
    />
  );
}
