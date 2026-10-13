import Link from 'next/link';
import { Plus, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function PlannerHeader({ canCompose, query }: { canCompose: boolean; query: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-7">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.04em] sm:text-[32px]">
          Publishing planner
        </h1>
        <p className="mt-2 text-[13px] text-muted">
          Your content, your next post, your peace of mind.
        </p>
      </div>
      {canCompose ? (
        <Button asChild className="h-11 rounded-xl px-4 shadow-xs">
          <Link data-new-post href={`/planner?${query}&compose=new`} scroll={false}>
            <Plus aria-hidden="true" />
            New post
          </Link>
        </Button>
      ) : (
        <Button asChild variant="outline" className="h-11 rounded-xl">
          <Link href="#channels">
            Connect Instagram
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
      )}
    </header>
  );
}
