import Link from 'next/link';
import { Instagram, CalendarClock, ChevronRight } from 'lucide-react';
import type { Channel, PlannerPost } from '@social-scheduler/shared';
export function MobileWorkspaceContext({
  channels,
  upcoming,
}: {
  channels: Channel[];
  upcoming: PlannerPost[];
}) {
  const connected = channels.some((channel) => channel.status === 'CONNECTED');
  const next = upcoming[0];
  return (
    <div className="mb-5 grid gap-2 rounded-xl border border-line bg-paper p-3 text-xs sm:grid-cols-2 xl:hidden">
      <Link
        href="#channels"
        className="flex min-h-9 min-w-0 items-center gap-2 rounded-md px-1 text-muted hover:text-ink"
      >
        <Instagram className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">
          {connected ? 'Instagram connected' : 'Connect Instagram'}
        </span>
        <span
          className={`size-1.5 shrink-0 rounded-full ${connected ? 'bg-success' : 'bg-muted'}`}
          aria-hidden="true"
        />
        <ChevronRight className="size-3.5" aria-hidden="true" />
      </Link>
      <Link
        href="/planner?view=scheduled"
        className="flex min-h-9 min-w-0 items-center gap-2 rounded-md px-1 text-muted hover:text-ink"
      >
        <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">
          {next?.scheduledAt
            ? `Next: ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: next.timezone }).format(new Date(next.scheduledAt))} (${next.timezone})`
            : 'No posts scheduled yet'}
        </span>
        <ChevronRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
