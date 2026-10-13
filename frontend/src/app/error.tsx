'use client';

import { Button } from '@/components/ui/button';

export default function ErrorScreen({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="grid min-h-svh place-items-center p-6">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">Your workspace is temporarily unavailable.</h1>
        <p className="text-muted">Try again in a moment.</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
