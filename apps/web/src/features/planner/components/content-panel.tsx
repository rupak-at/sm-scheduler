import Link from 'next/link';
import { RefreshCw, ChevronRight } from 'lucide-react';
import type { z } from 'zod';
import type { workspaceSchema } from '@social-scheduler/shared';
import { Button } from '@/components/ui/button';
import { ContentFilters } from './content-filters';
import { PostList } from './post-list';
import type { PlannerView } from '../planner-views';

export function ContentPanel({
  data,
  view,
  query,
  act,
  pending,
  refresh,
}: {
  data: z.infer<typeof workspaceSchema>;
  view: PlannerView;
  query: string;
  act: (path: string, method?: string) => Promise<void>;
  pending: boolean;
  refresh: () => Promise<void>;
}) {
  return (
    <section
      className="min-w-0 overflow-hidden rounded-2xl border border-line bg-paper shadow-xs"
      aria-labelledby="content-heading"
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-5 sm:px-5">
        <h2 id="content-heading" className="text-[15px] font-semibold">
          Your content
        </h2>
        <span className="text-xs text-muted tabular-nums">
          {data.counts[view].toLocaleString('en')} {data.counts[view] === 1 ? 'post' : 'posts'}
        </span>
      </div>
      <ContentFilters view={view} />
      <PostList
        posts={data.posts}
        channels={data.channels}
        view={view}
        query={query}
        act={act}
        pending={pending}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 sm:px-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-11 text-xs text-muted"
          disabled={pending}
          onClick={() => void refresh()}
        >
          <RefreshCw className="size-3" aria-hidden="true" />
          Refresh status
        </Button>
        <div className="flex flex-wrap gap-2">
          {query.includes('cursor=') && (
            <Link
              href={`/planner?view=${view}`}
              className="flex min-h-11 items-center rounded-md px-2 text-xs text-muted hover:bg-surface"
            >
              First page
            </Link>
          )}
          {data.nextCursor && (
            <Link
              href={`/planner?view=${view}&cursor=${data.nextCursor}`}
              className="flex min-h-11 items-center gap-1 rounded-md px-2 text-xs hover:bg-surface"
            >
              Next page
              <ChevronRight className="size-3" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
