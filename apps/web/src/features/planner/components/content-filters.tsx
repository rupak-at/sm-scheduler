import Link from 'next/link';
import { plannerViews, type PlannerView } from '../planner-views';

export function ContentFilters({ view }: { view: PlannerView }) {
  return (
    <nav
      className="flex gap-4 overflow-x-auto border-b border-line px-4 sm:gap-6 sm:px-5 md:gap-5 md:px-6"
      aria-label="Content status"
    >
      {plannerViews.map((item) => (
        <Link
          key={item.id}
          href={item.id === 'all' ? '/planner' : `/planner?view=${item.id}`}
          aria-current={view === item.id ? 'page' : undefined}
          scroll={false}
          className="border-b-2 border-transparent px-0.5 py-4 text-sm font-medium whitespace-nowrap text-muted hover:border-line hover:text-ink focus-visible:-outline-offset-4 aria-[current]:border-ink aria-[current]:text-ink md:px-1"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
