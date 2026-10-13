import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComposerLink } from './composer-link';
export function PlannerHeader({ canCompose, query }: { canCompose: boolean; query: string }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0 flex-1">
        <h1 className="text-[27px] leading-tight font-semibold tracking-[-0.035em] sm:text-[30px]">
          <span className="sm:hidden">Planner</span>
          <span className="hidden sm:inline">Publishing planner</span>
        </h1>
        <p className="mt-2 hidden text-[13px] text-muted sm:block">
          Drafts, upcoming posts, and everything you’ve shared.
        </p>
      </div>
      {canCompose && (
        <Button asChild className="h-11 rounded-lg px-5">
          <ComposerLink data-new-post href={`/planner?${query}&compose=new`} scroll={false}>
            <Plus aria-hidden="true" />
            New post
          </ComposerLink>
        </Button>
      )}
    </header>
  );
}
