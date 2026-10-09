import { ImagePlus, Send, TextCursorInput } from 'lucide-react';
import { plannerViews, type PlannerView } from '../planner-views';

const workflow = [
  { label: 'Capture an idea', icon: ImagePlus },
  { label: 'Shape your post', icon: TextCursorInput },
  { label: 'Pick your moment', icon: Send },
];

export function EmptyPlanner({ view }: { view: PlannerView }) {
  const current = plannerViews.find((item) => item.id === view) ?? plannerViews[0];
  return (
    <div className="relative px-5 py-9 pb-12 text-center md:px-8 md:py-15 md:pb-18">
      <div
        className="mx-auto mb-10 grid max-w-[540px] grid-cols-3 gap-2 text-left md:gap-4"
        aria-hidden="true"
      >
        {workflow.map(({ label, icon: Icon }, index) => (
          <div
            className="relative flex min-h-[120px] min-w-0 flex-col justify-between rounded-md border border-dashed border-[#b6c8e0] bg-[#f7faff] px-3 pt-8 pb-3 text-[#587394] nth-2:mt-3 nth-2:-mb-3 nth-3:border-solid nth-3:border-[#a5bde9] nth-3:bg-[#eaf1fd] nth-3:text-[#214b94] md:min-h-[166px] md:px-4.5 md:pt-10 md:pb-4.5"
            key={label}
          >
            <span className="absolute top-2.5 right-3 text-xs tabular-nums">{index + 1}</span>
            <Icon size={28} strokeWidth={1.5} />
            <span className="mt-6 hidden text-sm md:block">{label}</span>
          </div>
        ))}
      </div>
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{current.heading}</h2>
      <p className="mx-auto mt-4 max-w-[49ch] text-sm text-muted md:text-base">
        {view === 'all'
          ? 'Your drafts, scheduled posts, and publishing history will live here. For now, your canvas is clear.'
          : `You don’t have any ${view} posts yet. They’ll appear here as you build your publishing rhythm.`}
      </p>
      <span
        className="absolute bottom-0 left-[calc(50%-14px)] h-2.5 w-7 rounded-t-full bg-honey"
        aria-hidden="true"
      />
    </div>
  );
}
