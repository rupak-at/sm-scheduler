import type { ReactNode } from 'react';
import { WorkspaceNav } from './workspace-nav';
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
    <div className="min-h-svh">
      <WorkspaceNav userName={userName} connected={connected} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-[1440px] min-w-0 px-[max(16px,env(safe-area-inset-left),env(safe-area-inset-right))] py-7 pb-12 sm:px-8 sm:py-10 lg:px-10"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
