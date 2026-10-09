import { CalendarDays, Instagram } from 'lucide-react';
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
      className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-paper px-[max(20px,env(safe-area-inset-left))] py-4 md:sticky md:top-0 md:h-svh md:flex-col md:items-stretch md:justify-start md:gap-0 md:border-r md:border-b-0 md:px-4 md:py-6"
      aria-label="Workspace navigation"
    >
      <Brand className="md:ml-2" href="/planner" />
      <nav aria-label="Main" className="hidden md:mt-10 md:block">
        <Link
          className="flex items-center gap-3 rounded-lg border border-line bg-paper px-3 py-2.5 text-sm font-medium shadow-xs hover:bg-surface"
          href="/planner"
          aria-current="page"
        >
          <CalendarDays size={18} strokeWidth={1.7} aria-hidden="true" />
          Planner
        </Link>
      </nav>
      <div className="mt-8 hidden border-t border-line pt-6 md:block">
        <p className="px-3 text-xs font-medium text-muted">Channels</p>
        <div className="mt-3 flex items-start gap-3 px-3 py-2">
          <Instagram size={18} className="mt-0.5 text-muted" aria-hidden="true" />
          <div>
            <p className="text-sm">Instagram</p>
            <p className="mt-1 text-xs text-muted">{connected ? 'Connected' : 'Not connected'}</p>
          </div>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 md:mt-auto md:border-t md:border-line md:pt-5">
        <span
          className="hidden size-8 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-xs font-medium md:flex"
          aria-hidden="true"
        >
          {userName.trim().charAt(0).toLocaleUpperCase() || 'U'}
        </span>
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="text-xs text-muted">Personal workspace</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
