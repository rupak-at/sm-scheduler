import { ChevronRight, Instagram } from 'lucide-react';
import { ContentFilters } from './content-filters';
import { EmptyPlanner } from './empty-planner';
import { Sidebar } from './sidebar';
import { ConnectionGuide } from './connection-guide';
import { PlannerSetup } from './planner-setup';
import type { PlannerView } from '../planner-views';

export function Planner({ view, userName }: { view: PlannerView; userName: string }) {
  return (
    <div className="min-h-svh md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <Sidebar userName={userName} />
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
          <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
                Publishing planner
              </h1>
              <p className="mt-2 text-sm text-muted">
                A clear view of your content, from idea to published.
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs text-muted">
              <Instagram size={14} aria-hidden="true" />
              No channel connected
            </span>
          </header>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
            <section
              className="min-w-0 overflow-hidden rounded-xl border border-line bg-paper"
              aria-label="Your content"
            >
              <ContentFilters view={view} />
              <EmptyPlanner view={view} />
              <ConnectionGuide />
            </section>
            <PlannerSetup />
          </div>
          <p className="mt-5 text-center text-xs text-muted">
            A little planning. A little more space to create.
          </p>
        </main>
      </div>
    </div>
  );
}
