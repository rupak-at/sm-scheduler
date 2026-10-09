import { redirect } from 'next/navigation';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { getSession } from '@/features/auth/lib/session';

export const metadata = { title: 'Create account | Social Scheduler' };

export default async function SignupPage() {
  if (await getSession()) redirect('/');
  return <AuthScreen mode="signup" />;
}
