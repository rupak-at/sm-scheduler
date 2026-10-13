import { CalendarDays, Instagram, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { Brand } from '@/components/brand';
import { LogoutButton } from '@/features/auth/components/logout-button';
export function Sidebar({
  userName,
  connected = false,
}: {
  userName: string;
  connected?: boolean;
}) {
  return (
    <aside
      className="flex items-center justify-between gap-3 border-b border-line bg-paper px-[max(16px,env(safe-area-inset-left))] py-3 lg:sticky lg:top-0 lg:h-svh lg:flex-col lg:items-stretch lg:justify-start lg:gap-0 lg:border-r lg:border-b-0 lg:bg-canvas lg:px-4 lg:py-5"
      aria-label="Workspace navigation"
    >
      <Brand className="lg:ml-1 [&>span:last-child]:text-[13px]" href="/planner" />
      <nav aria-label="Main" className="hidden lg:mt-10 lg:block">
        <Link
          className="flex items-center gap-3 rounded-xl bg-paper px-3 py-3 text-[13px] font-medium shadow-xs ring-1 ring-line hover:bg-surface"
          href="/planner"
          aria-current="page"
        >
          <CalendarDays className="size-4" strokeWidth={1.7} aria-hidden="true" />
          Publishing planner
        </Link>
        <Link
          href="#channels"
          className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] text-muted hover:bg-surface hover:text-ink"
        >
          <Instagram className="size-4" strokeWidth={1.7} aria-hidden="true" />
          Instagram
          <span
            className={`ml-auto size-1.5 rounded-full ${connected ? 'bg-success' : 'bg-muted'}`}
            aria-hidden="true"
          />
          <span className="sr-only">{connected ? 'Connected' : 'Not connected'}</span>
        </Link>
      </nav>
      <div className="mt-auto hidden px-3 pb-6 lg:block">
        <p className="text-sm font-medium">A little space to create.</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Plan your photos and Reels. Let your ideas find their moment.
        </p>
        <Link
          href="/#roadmap"
          className="mt-4 inline-flex items-center gap-1 rounded-sm text-xs text-muted hover:text-ink"
        >
          What’s coming
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
      <div className="flex min-w-0 items-center gap-2 lg:border-t lg:border-line lg:pt-5">
        <span
          className="hidden size-8 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-xs font-medium lg:flex"
          aria-hidden="true"
        >
          {userName.trim().charAt(0).toLocaleUpperCase() || 'U'}
        </span>
        <div className="hidden min-w-0 flex-1 lg:block">
          <p className="truncate text-xs font-medium">{userName}</p>
          <p className="text-[11px] text-muted">Personal workspace</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
