import { FileText } from 'lucide-react';
import { plannerViews, type PlannerView } from '../planner-views';

export function EmptyPlanner({ view }: { view: PlannerView }) {
  const current = plannerViews.find((item) => item.id === view) ?? plannerViews[0];
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-14 text-center md:min-h-[410px]">
      <div className="relative mb-7 h-20 w-20" aria-hidden="true">
        <div className="absolute top-1 left-1 h-16 w-13 -rotate-12 rounded-lg border border-line bg-canvas" />
        <div className="absolute top-2 right-1 h-16 w-13 rotate-12 rounded-lg border border-line bg-surface" />
        <div className="relative mx-auto grid h-18 w-14 place-items-center rounded-lg border border-line bg-paper shadow-xs">
          <FileText size={24} strokeWidth={1.3} className="text-muted" />
        </div>
      </div>
      <h2 className="text-xl font-semibold tracking-tight">{current.heading}</h2>
      <p className="mt-3 max-w-[42ch] text-sm leading-6 text-muted">{current.description}</p>
    </div>
  );
}
