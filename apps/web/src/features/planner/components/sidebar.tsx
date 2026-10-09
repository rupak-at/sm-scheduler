import { CalendarDays, Instagram, Layers2 } from 'lucide-react';
import Link from 'next/link';

export function Sidebar() {
  return (
    <aside
      className="flex items-center justify-between gap-4 border-b border-line px-[max(20px,env(safe-area-inset-left))] py-5 md:flex-col md:items-stretch md:justify-start md:gap-14 md:border-r md:border-b-0 md:px-4 md:py-7 xl:px-6 xl:py-10"
      aria-label="Workspace navigation"
    >
      <Link
        className="flex items-center gap-3 text-base leading-tight font-bold hover:text-denim md:text-xl"
        href="/"
        aria-label="Social Scheduler home"
      >
        <span className="grid h-12 w-11 shrink-0 place-items-center rounded-[8px_18px_8px_8px] bg-denim text-paper">
          <Layers2 size={24} aria-hidden="true" />
        </span>
        <span translate="no">
          Social
          <br />
          Scheduler
        </span>
      </Link>
      <nav aria-label="Main">
        <Link
          className="flex items-center gap-3 rounded-lg bg-[#dde8fb] px-3.5 py-3 font-semibold text-[#1648b3] hover:bg-[#cfdef8]"
          href="/"
          aria-current="page"
        >
          <CalendarDays size={20} aria-hidden="true" />
          Planner
        </Link>
      </nav>
      <div className="mt-auto hidden items-center gap-2.5 text-sm md:flex">
        <Instagram size={22} aria-hidden="true" />
        <div>
          <p>Instagram</p>
          <span className="text-xs text-muted">No account connected</span>
        </div>
      </div>
    </aside>
  );
}
