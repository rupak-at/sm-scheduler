import { InstagramButton } from './instagram-button';
import { ConnectionNotice } from '@/features/planner/components/connection-notice';
import Link from 'next/link';
import { Brand } from '@/components/brand';
import { AuthForm } from './auth-form';
import { AuthCompanion } from './auth-companion';

export function AuthScreen({
  mode,
  connection,
}: {
  connection?: string;
  mode: 'login' | 'signup';
}) {
  const signup = mode === 'signup';
  return (
    <div className="flex min-h-svh flex-col bg-paper">
      <header className="flex min-h-20 items-center justify-between gap-4 border-b border-line px-[max(24px,env(safe-area-inset-left))] sm:px-10 lg:px-12">
        <Brand />
        <Link
          href={signup ? '/login' : '/signup'}
          className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-ink"
        >
          {signup ? 'Log in' : 'Create account'}
        </Link>
      </header>
      <main
        id="main-content"
        className="mx-auto grid w-full max-w-[1280px] flex-1 gap-8 px-0 py-4 lg:grid-cols-[1fr_1fr] lg:px-10 lg:py-10"
      >
        <section className="flex flex-col items-center justify-center px-[max(24px,env(safe-area-inset-right))] py-12 sm:px-10 lg:py-16">
          <div className="w-full max-w-[360px]">
            <h1 className="text-[32px] leading-tight font-medium tracking-[-0.035em]">
              {signup ? 'Create your workspace' : 'Welcome back'}
            </h1>
            <p className="mt-3 text-sm text-muted">
              {signup
                ? 'A little more clarity for your content plans.'
                : 'Log in to pick up where you left off.'}
            </p>
            <div className="mt-7">
              <ConnectionNotice code={connection} />
              <InstagramButton mode="login" />
              <p className="mt-3 text-center text-xs text-muted">
                For Instagram Business and Creator accounts.
              </p>
            </div>
            <p className="mt-6 text-center text-xs text-muted">Or continue with email</p>
            <AuthForm mode={mode} />
          </div>
          <p className="mt-12 text-xs text-muted">Your content. Your pace.</p>
        </section>
        <AuthCompanion />
      </main>
    </div>
  );
}
