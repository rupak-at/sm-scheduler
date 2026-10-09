import { redirect } from 'next/navigation';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { getSession } from '@/features/auth/lib/session';

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
