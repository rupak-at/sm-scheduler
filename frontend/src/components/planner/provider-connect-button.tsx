'use client';
import { useState } from 'react';
import { Facebook, LoaderCircle, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ProviderConnectButton({
  provider,
  disabled = false,
}: {
  provider: 'facebook' | 'tiktok';
  disabled?: boolean;
}) {
  const name = provider === 'tiktok' ? 'TikTok' : 'Facebook';
  const Icon = provider === 'tiktok' ? Music2 : Facebook;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function start() {
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/api/auth/${provider}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const result: { url?: string } = await response.json();
      if (!response.ok || !result.url)
        throw new Error(
          response.status === 401
            ? `Log in again before connecting ${name}.`
            : `${name} could not start. Check app setup and try again.`,
        );
      const target = new URL(result.url);
      if (target.origin !== `https://www.${provider}.com`)
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
        disabled={disabled || pending}
        onClick={start}
      >
        {pending ? (
          <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
        ) : (
          <Icon aria-hidden="true" />
        )}
        {pending
          ? `Opening ${name}…`
          : provider === 'facebook'
            ? 'Connect Facebook Pages'
            : 'Connect TikTok'}
      </Button>
      <p role="alert" className="text-sm text-destructive empty:hidden">
        {error}
      </p>
    </div>
  );
}
