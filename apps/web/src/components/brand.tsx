import { Layers2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Social Scheduler home"
      className={cn('flex w-fit items-center gap-2.5 rounded-sm hover:opacity-80', className)}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink text-paper">
        <Layers2 size={18} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold tracking-tight" translate="no">
        Social Scheduler
      </span>
    </Link>
  );
}
