'use client';

import Link from 'next/link';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthForm } from '@/hooks/auth/use-auth-form';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const { submit, pending, error } = useAuthForm(mode);
  const signup = mode === 'signup';
  return (
    <form onSubmit={submit} className="mt-8 space-y-5" aria-busy={pending}>
      {signup && (
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" autoComplete="name" required minLength={2} maxLength={80} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          required
          maxLength={254}
          aria-describedby={error ? 'auth-error' : undefined}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={signup ? 'new-password' : 'current-password'}
          minLength={12}
          maxLength={128}
          required
          aria-describedby={signup ? 'password-guidance' : undefined}
        />
        {signup && (
          <p id="password-guidance" className="text-xs text-muted">
            Use at least 12 characters. A passphrase works well.
          </p>
        )}
      </div>
      <p
        id="auth-error"
        className="text-sm text-destructive empty:hidden"
        role="alert"
        aria-live="polite"
      >
        {error}
      </p>
      <Button type="submit" disabled={pending} className="h-11 w-full rounded-lg">
        {pending && <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />}
        {pending
          ? signup
            ? 'Creating account…'
            : 'Logging in…'
          : signup
            ? 'Create account'
            : 'Log in'}
      </Button>
      <p className="text-center text-sm text-muted">
        {signup ? 'Already have an account? ' : 'New to Social Scheduler? '}
        <Link
          className="font-medium text-ink underline underline-offset-4 hover:text-muted"
          href={signup ? '/login' : '/signup'}
        >
          {signup ? 'Log in' : 'Create an account'}
        </Link>
      </p>
    </form>
  );
}
