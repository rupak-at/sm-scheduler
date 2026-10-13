import Link from 'next/link';
import { FilePenLine, Clock3, CheckCheck, CircleAlert, ArrowUpRight } from 'lucide-react';
import type { WorkspaceCounts } from '@social-scheduler/shared';
import type { PlannerView } from '../planner-views';

const sections = [
  { id: 'drafts', label: 'Drafts', hint: 'Ready for your next idea', icon: FilePenLine },
  { id: 'scheduled', label: 'Scheduled', hint: 'In your publishing queue', icon: Clock3 },
  { id: 'published', label: 'Published', hint: 'Shared with your audience', icon: CheckCheck },
  { id: 'attention', label: 'Needs attention', hint: 'Posts to review', icon: CircleAlert },
] as const;

export function WorkspaceOverview({
  counts,
  view,
}: {
  counts: WorkspaceCounts;
  view: PlannerView;
}) {
  return (
    <nav
      aria-label="Workspace overview"
      className="mb-7 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-paper shadow-xs sm:grid-cols-4"
    >
      {sections.map(({ id, label, hint, icon: Icon }) => (
        <Link
          key={id}
          href={`/planner?view=${id}`}
          scroll={false}
          aria-current={view === id ? 'page' : undefined}
          className="group min-w-0 border-line p-4 hover:bg-canvas focus-visible:-outline-offset-4 aria-[current]:bg-canvas sm:p-5 sm:[&:not(:last-child)]:border-r [&:nth-child(-n+2)]:border-b sm:[&:nth-child(-n+2)]:border-b-0 [&:nth-child(odd)]:border-r"
        >
          <div className="flex items-center justify-between gap-2 text-muted">
            <Icon className="size-4" aria-hidden="true" strokeWidth={1.6} />
            <ArrowUpRight
              className="size-3.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden="true"
            />
          </div>
          <p
            className={`mt-3 text-[28px] leading-none font-medium tracking-tight tabular-nums ${id === 'attention' && counts.attention > 0 ? 'text-destructive' : 'text-ink'}`}
          >
            {counts[id].toLocaleString('en')}
          </p>
          <p className="mt-2 text-[13px] font-medium">{label}</p>
          <p className="mt-1 hidden text-xs text-muted xl:block">{hint}</p>
        </Link>
      ))}
    </nav>
  );
}
