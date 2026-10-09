'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { authClient } from '../lib/auth-client';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    setPending(true);
    setError('');
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError('Could not log out. Try again.');
        return;
      }
      router.replace('/login');
      router.refresh();
    } catch {
      setError('Could not log out. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <Button variant="ghost" size="sm" onClick={logout} disabled={pending}>
        {pending ? 'Logging out…' : 'Log out'}
      </Button>
      <p className="mt-1 text-xs text-destructive" role="alert" aria-live="polite">
        {error}
      </p>
    </div>
  );
}
