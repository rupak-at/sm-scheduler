import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
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
    <div className="min-h-svh md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <Sidebar userName={userName} connected={connected} />
      <div className="min-w-0">
        <div className="hidden h-[73px] items-center gap-3 border-b border-line bg-paper px-8 text-sm md:flex">
          <span className="text-muted">Workspace</span>
          <ChevronRight size={14} className="text-muted" aria-hidden="true" />
          <span className="font-medium">Planner</span>
        </div>
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1200px] min-w-0 px-[max(20px,env(safe-area-inset-right))] py-8 pb-12 md:px-8 md:py-10 xl:px-12"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
