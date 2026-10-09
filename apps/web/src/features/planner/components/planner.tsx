import { ContentFilters } from './content-filters';
import { EmptyPlanner } from './empty-planner';
import { Sidebar } from './sidebar';
import type { PlannerView } from '../planner-views';
import { Badge } from '@/components/ui/badge';
import { LogoutButton } from '@/features/auth/components/logout-button';

export function Planner({ view, userName }: { view: PlannerView; userName: string }) {
  return (
    <div className="min-h-svh md:grid md:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[224px_minmax(0,1fr)]">
      <Sidebar />
      <main
        id="main-content"
        className="w-full max-w-[1320px] min-w-0 px-[max(20px,env(safe-area-inset-right))] py-8 pb-12 md:px-8 md:py-14 xl:px-16"
        tabIndex={-1}
      >
        <header className="mb-9 flex flex-col gap-4 xl:flex-row xl:justify-between xl:gap-6">
          <div>
            <h1 className="text-3xl leading-tight font-bold tracking-tight xl:text-4xl">
              Publishing planner
            </h1>
            <p className="mt-2.5 text-muted">A clear place for the posts you’re preparing.</p>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-2 xl:items-end">
            <span className="max-w-48 truncate text-sm text-muted">{userName}</span>
            <Badge variant="secondary">Instagram setup is next</Badge>
            <LogoutButton />
          </div>
        </header>
        <section
          className="overflow-hidden rounded-xl border border-line bg-paper"
          aria-label="Your content"
        >
          <ContentFilters view={view} />
          <EmptyPlanner view={view} />
        </section>
        <NextStep />
      </main>
    </div>
  );
}

function NextStep() {
  return (
    <section
      className="mt-8 grid gap-4 px-0.5 py-1 xl:grid-cols-[1fr_0.55fr] xl:gap-12"
      aria-labelledby="next-step-heading"
    >
      <div>
        <h2 id="next-step-heading" className="mb-3 text-xl font-semibold tracking-tight">
          First, a place to publish.
        </h2>
        <p className="max-w-[60ch] text-sm text-muted">
          Instagram account connection is coming next. Once it’s ready, you’ll be able to connect an
          eligible account and start preparing your posts.
        </p>
      </div>
      <details>
        <summary className="w-fit cursor-pointer py-2 text-sm font-semibold text-denim hover:text-blue-900">
          What happens next?
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>Connect your Instagram account.</li>
          <li>Upload supported media and write your caption.</li>
          <li>Choose a publishing time and follow its progress here.</li>
        </ol>
      </details>
    </section>
  );
}
