'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth/auth-client';

export function useAuthForm(mode: 'login' | 'signup') {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const credentials = {
      email: String(data.get('email') ?? '').trim(),
      password: String(data.get('password') ?? ''),
    };
    setPending(true);
    setError('');
    try {
      const result =
        mode === 'signup'
          ? await authClient.signUp.email({
              ...credentials,
              name: String(data.get('name') ?? '').trim(),
            })
          : await authClient.signIn.email(credentials);
      if (result.error) {
        setError(
          result.error.status === 429
            ? 'Too many attempts. Wait a minute, then try again.'
            : result.error.status >= 500
              ? 'Sign-in is temporarily unavailable. Try again shortly.'
              : mode === 'login'
                ? 'Check your email and password, then try again.'
                : 'Could not create your account. Check your details, or log in if you already have an account.',
        );
        form.querySelector<HTMLInputElement>('input[name="email"]')?.focus();
        return;
      }
      router.replace('/planner');
      router.refresh();
    } catch {
      setError('Could not reach sign-in. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }
  return { submit, pending, error };
}
