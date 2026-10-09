import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function PlannerHeader({ canCompose, query }: { canCompose: boolean; query: string }) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-balance">
          Publishing planner
        </h1>
        <p className="mt-2 text-sm text-muted">
          A clear view of your content, from idea to published.
        </p>
      </div>
      {canCompose ? (
        <Button asChild>
          <Link href={`/planner?${query}&compose=new`}>
            <Plus aria-hidden="true" />
            New post
          </Link>
        </Button>
      ) : (
        <p className="text-sm text-muted">Connect Instagram to create your first post.</p>
      )}
    </header>
  );
}
