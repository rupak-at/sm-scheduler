import Link from 'next/link';
import { plannerViews, type PlannerView } from '../planner-views';
export function ContentFilters({ view }: { view: PlannerView }) {
  return (
    <nav
      className="flex min-w-0 gap-4 overflow-x-auto border-b border-line px-4 sm:gap-5 sm:px-5"
      aria-label="Content status"
    >
      {plannerViews.map((item) => (
        <Link
          key={item.id}
          href={item.id === 'all' ? '/planner' : `/planner?view=${item.id}`}
          aria-current={view === item.id ? 'page' : undefined}
          scroll={false}
          className="border-b-2 border-transparent py-4 text-[13px] font-medium whitespace-nowrap text-muted hover:text-ink focus-visible:-outline-offset-4 aria-[current]:border-ink aria-[current]:text-ink"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
