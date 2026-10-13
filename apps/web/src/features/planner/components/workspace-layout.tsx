import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from './sidebar';
export function WorkspaceLayout({
  userName,
  connected,
  children,
}: {
  userName: string;
  connected: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[208px_minmax(0,1fr)]">
      <Sidebar userName={userName} connected={connected} />
      <div className="min-w-0">
        <div className="hidden h-16 items-center justify-between gap-3 border-b border-line/80 bg-paper px-8 text-xs lg:flex">
          <div className="flex items-center gap-2.5">
            <span className="text-muted">Workspace</span>
            <ChevronRight className="size-3 text-muted" aria-hidden="true" />
            <span className="font-medium">Publishing planner</span>
          </div>
          <Link
            href="#channels"
            className="flex items-center gap-2 rounded-md py-2 text-muted hover:text-ink"
          >
            <span
              className={`size-1.5 rounded-full ${connected ? 'bg-success' : 'bg-muted'}`}
              aria-hidden="true"
            />
            {connected ? 'Instagram connected' : 'Connect Instagram'}
          </Link>
        </div>
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1480px] min-w-0 px-[max(16px,env(safe-area-inset-right))] py-6 pb-10 sm:px-6 lg:px-8 lg:py-8 xl:px-10"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
