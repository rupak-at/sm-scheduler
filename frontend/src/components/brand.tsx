import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';
import { cn } from '@/lib/utils';

export function Brand({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Social Scheduler home"
      className={cn('flex w-fit items-center gap-2.5 rounded-sm hover:opacity-80', className)}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink text-paper">
        <BrandMark className="size-8" />
      </span>
      <span className="text-sm leading-none tracking-[-0.035em] whitespace-nowrap" translate="no">
        <span className="font-semibold">Social</span> <span className="font-normal">Scheduler</span>
      </span>
    </Link>
  );
}
