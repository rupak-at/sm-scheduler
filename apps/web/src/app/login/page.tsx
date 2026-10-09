import { redirect } from 'next/navigation';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { getSession } from '@/features/auth/lib/session';

export const metadata = { title: 'Log in | Social Scheduler' };

export default async function LoginPage() {
  if (await getSession()) redirect('/planner');
  return <AuthScreen mode="login" />;
}
