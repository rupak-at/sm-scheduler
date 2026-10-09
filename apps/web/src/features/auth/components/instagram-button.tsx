'use client';
import { useState } from 'react';
import { Instagram, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InstagramButton({
  mode,
  disabled = false,
  label,
}: {
  mode: 'login' | 'connect';
  disabled?: boolean;
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function start() {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/instagram/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const result: { url?: string; message?: string } = await response.json();
      if (!response.ok || !result.url)
        throw new Error(
          response.status === 404
            ? 'Instagram login is not configured yet. Follow the Instagram setup guide.'
            : (result.message ?? 'Instagram could not start. Try again shortly.'),
        );
      const target = new URL(result.url);
      if (target.origin !== 'https://www.instagram.com')
        throw new Error('Invalid authorization destination.');
      window.location.assign(target.toString());
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Connection failed.');
      setPending(false);
    }
  }
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={pending || disabled}
        onClick={start}
      >
        {pending ? (
          <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
        ) : (
          <Instagram aria-hidden="true" />
        )}
        {pending
          ? 'Opening Instagram…'
          : (label ?? (mode === 'login' ? 'Continue with Instagram' : 'Connect Instagram'))}
      </Button>
      <p role="alert" className="text-sm text-destructive empty:hidden">
        {error}
      </p>
    </div>
  );
}
