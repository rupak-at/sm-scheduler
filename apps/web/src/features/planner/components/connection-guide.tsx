import { ChevronDown, Instagram } from 'lucide-react';

export function ConnectionGuide() {
  return (
    <details className="group border-t border-line">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-5 hover:bg-canvas focus-visible:-outline-offset-4 md:px-7 [&::-webkit-details-marker]:hidden">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-canvas">
          <Instagram size={18} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Your first channel</span>
          <span className="mt-0.5 block text-xs text-muted">
            Instagram connection is coming next.
          </span>
        </span>
        <span className="hidden text-xs text-muted sm:inline">See what’s next</span>
        <ChevronDown
          size={16}
          className="shrink-0 text-muted group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-line bg-canvas px-5 py-6 md:px-7">
        <p className="max-w-[64ch] text-sm leading-6 text-muted">
          Your account is ready. These publishing tools are still being built. When they’re
          available, you’ll be able to:
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink">
          <li>Connect an eligible Instagram account.</li>
          <li>Add media and write your caption.</li>
          <li>Choose a publishing time and follow its progress.</li>
        </ol>
      </div>
    </details>
  );
}
