import Link from 'next/link';
import { Instagram } from 'lucide-react';
import { Brand } from '@/components/brand';
import { LogoutButton } from '@/features/auth/components/logout-button';
export function WorkspaceNav({ userName, connected }: { userName: string; connected: boolean }) {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-3 px-[max(16px,env(safe-area-inset-left),env(safe-area-inset-right))] sm:px-8">
        <div className="flex min-w-0 items-center gap-8">
          <Brand href="/planner" className="min-h-11 [&>span:last-child]:text-[13px]" />
          <Link
            href="/planner"
            aria-current="page"
            className="hidden border-b-2 border-ink py-5 text-[13px] font-medium md:block"
          >
            Planner
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-5">
          <Link
            href="#channels"
            className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-1 text-xs text-muted hover:text-ink"
            aria-label={
              connected ? 'Instagram connected. View account details' : 'Connect Instagram'
            }
          >
            <Instagram className="size-4 sm:hidden" aria-hidden="true" />
            <span
              className={`size-1.5 rounded-full ${connected ? 'bg-success' : 'bg-muted'}`}
              aria-hidden="true"
            />
            <span className="hidden sm:block">
              {connected ? 'Instagram connected' : 'Connect Instagram'}
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:border-l sm:border-line sm:pl-5">
            <span
              className="hidden size-8 place-items-center rounded-full border border-line bg-canvas text-xs font-medium sm:grid"
              aria-hidden="true"
            >
              {userName.trim().charAt(0).toLocaleUpperCase() || 'U'}
            </span>
            <span className="hidden max-w-36 truncate text-xs font-medium lg:block">
              {userName}
            </span>
            <LogoutButton compact />
          </div>
        </div>
      </div>
    </header>
  );
}
