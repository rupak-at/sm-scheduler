import { CalendarDays, FileText, Instagram } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function WorkspaceStory() {
  return (
    <section
      id="workspace"
      className="mx-auto grid max-w-[1280px] scroll-mt-8 gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20 lg:px-12"
    >
      <div>
        <h2 className="max-w-[14ch] text-[clamp(2rem,3.5vw,3.25rem)] leading-[1.1] font-medium tracking-[-0.04em]">
          More room for the work that matters.
        </h2>
        <p className="mt-6 max-w-[40ch] text-base leading-7 text-muted">
          Your creative process deserves a home. A quiet workspace with a clear view of where your
          content will go next.
        </p>
        <p className="mt-4 max-w-[40ch] text-sm leading-6 text-muted">
          Create an account and explore your planner today. Instagram connection, drafts, and
          scheduling are the next pieces we’re building.
        </p>
        <Button
          asChild
          variant="outline"
          className="mt-8 h-11 rounded-full border-line px-6 shadow-none"
        >
          <Link href="/planner">Explore the planner</Link>
        </Button>
      </div>
      <WorkspacePreview />
    </section>
  );
}

function WorkspacePreview() {
  return (
    <figure className="min-w-0 overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_12px_48px_-24px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 text-xs">
        <span className="flex items-center gap-2 font-medium">
          <CalendarDays size={15} aria-hidden="true" />
          Publishing planner
        </span>
        <span className="text-muted">Workspace preview</span>
      </div>
      <div className="border-b border-line px-5 py-4 text-xs font-medium text-muted">
        All content<span className="ml-6 hidden sm:inline">Drafts</span>
        <span className="ml-6 hidden sm:inline">Scheduled</span>
      </div>
      <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[300px]">
        <span className="mb-5 grid size-14 place-items-center rounded-2xl border border-line bg-canvas">
          <FileText size={22} strokeWidth={1.4} aria-hidden="true" />
        </span>
        <p className="text-base font-medium">Your next idea starts here</p>
        <p className="mt-2 max-w-[30ch] text-sm leading-6 text-muted">
          A clear canvas for the content you’ll create.
        </p>
      </div>
      <figcaption className="flex items-center gap-3 bg-canvas px-5 py-4 text-xs text-muted">
        <Instagram size={16} aria-hidden="true" />
        Instagram connection is coming next.
      </figcaption>
    </figure>
  );
}
