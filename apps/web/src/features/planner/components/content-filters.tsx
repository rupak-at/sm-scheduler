import Link from 'next/link';
import type { WorkspaceCounts } from '@social-scheduler/shared';
import { plannerViews, type PlannerView } from '../planner-views';
export function ContentFilters({ view, counts }: { view: PlannerView; counts: WorkspaceCounts }) {
  return (
    <nav
      className="flex min-w-0 gap-5 overflow-x-auto border-b border-line px-4 sm:px-6"
      aria-label="Content status"
    >
      {plannerViews.map((item) => (
        <Link
          key={item.id}
          href={item.id === 'all' ? '/planner' : `/planner?view=${item.id}`}
          aria-current={view === item.id ? 'page' : undefined}
          scroll={false}
          className="flex min-h-14 shrink-0 items-center gap-2 border-b-2 border-transparent text-[13px] font-medium whitespace-nowrap text-muted hover:text-ink focus-visible:-outline-offset-4 aria-[current]:border-ink aria-[current]:text-ink"
        >
          {item.label}
          <span className="rounded-md bg-canvas px-1.5 py-0.5 text-[11px] tabular-nums">
            {counts[item.id].toLocaleString('en')}
          </span>
        </Link>
      ))}
    </nav>
  );
}
