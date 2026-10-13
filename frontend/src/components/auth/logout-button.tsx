'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/auth-client';

export function LogoutButton({ compact = false }: { compact?: boolean }) {
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
      <Button
        variant="ghost"
        size="sm"
        className="h-11 min-w-11 text-xs text-muted hover:text-ink"
        onClick={logout}
        disabled={pending}
      >
        <LogOut size={14} aria-hidden="true" />
        <span className={compact ? 'sr-only' : 'md:sr-only'}>
          {pending ? 'Logging out…' : 'Log out'}
        </span>
      </Button>
      <p
        className="mt-1 max-w-48 text-xs text-destructive empty:hidden"
        role="alert"
        aria-live="polite"
      >
        {error}
      </p>
    </div>
  );
}
