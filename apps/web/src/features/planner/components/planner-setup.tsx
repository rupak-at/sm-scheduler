import { Check, Circle, Instagram } from 'lucide-react';

const steps = [
  {
    title: 'Create your workspace',
    description: 'Your personal planner is ready.',
    complete: true,
  },
  {
    title: 'Connect Instagram',
    description: 'Account connection is coming next.',
    complete: false,
  },
  {
    title: 'Prepare your first post',
    description: 'Drafts and media tools are in development.',
    complete: false,
  },
];

export function PlannerSetup() {
  return (
    <aside className="rounded-xl border border-line bg-paper p-6" aria-labelledby="setup-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="setup-heading" className="text-sm font-semibold">
          A thoughtful start
        </h2>
        <Instagram size={16} className="text-muted" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">
        Your workspace is ready. Here’s where we’re heading.
      </p>
      <ol className="mt-6 space-y-6">
        {steps.map(({ title, description, complete }) => (
          <li key={title} className="flex gap-3">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-line bg-canvas">
              {complete ? (
                <Check size={12} aria-hidden="true" />
              ) : (
                <Circle size={7} className="text-muted" aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="text-xs font-medium">
                {title}
                <span className="sr-only">{complete ? ': completed' : ': upcoming'}</span>
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-7 border-t border-line pt-5 text-xs leading-5 text-muted">
        Publishing tools will become available here as they’re built.
      </p>
    </aside>
  );
}
