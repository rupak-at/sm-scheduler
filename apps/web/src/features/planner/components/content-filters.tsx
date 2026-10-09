import Link from 'next/link';
import { plannerViews, type PlannerView } from '../planner-views';

export function ContentFilters({ view }: { view: PlannerView }) {
  return (
    <nav
      className="flex gap-6 overflow-x-auto border-b border-line px-5 md:gap-7 md:px-8"
      aria-label="Content status"
    >
      {plannerViews.map((item) => (
        <Link
          key={item.id}
          href={item.id === 'all' ? '/' : `/?view=${item.id}`}
          aria-current={view === item.id ? 'page' : undefined}
          scroll={false}
          className="border-b-3 border-transparent px-0.5 pt-5 pb-4 text-sm font-medium whitespace-nowrap text-muted hover:border-denim hover:text-denim focus-visible:-outline-offset-4 aria-[current]:border-denim aria-[current]:text-denim"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
