import { CalendarDays, Layers2 } from 'lucide-react';
import { AuthForm } from './auth-form';

export function AuthScreen({ mode }: { mode: 'login' | 'signup' }) {
  const signup = mode === 'signup';
  return (
    <main
      id="main-content"
      className="grid min-h-svh grid-rows-[auto_1fr] lg:grid-cols-[1fr_1.1fr] lg:grid-rows-1"
    >
      <section
        className="flex flex-col justify-between bg-ink px-8 py-6 text-paper lg:px-16 lg:py-14"
        aria-label="Social Scheduler"
      >
        <div className="flex items-center gap-3 text-xl font-semibold" translate="no">
          <Layers2 size={28} aria-hidden="true" /> Social Scheduler
        </div>
        <div className="my-24 hidden max-w-lg lg:block">
          <CalendarDays
            className="mb-7 text-[#9ebcf1]"
            size={48}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p className="text-3xl leading-tight font-medium tracking-tight lg:text-5xl">
            A little space for your next big idea.
          </p>
          <p className="mt-5 max-w-[42ch] text-[#c0d0e5]">
            Keep your content plans together. Build a publishing rhythm that works for you.
          </p>
        </div>
        <p className="hidden text-sm text-[#c0d0e5] lg:block">
          Built for creators. Starting with Instagram.
        </p>
      </section>
      <section className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl leading-tight font-bold tracking-tight">
            {signup ? 'Make yourself at home.' : 'Welcome back.'}
          </h1>
          <p className="mt-3 text-muted">
            {signup
              ? 'Create an account to start your workspace.'
              : 'Log in to your publishing workspace.'}
          </p>
          <AuthForm mode={mode} />
        </div>
      </section>
    </main>
  );
}
