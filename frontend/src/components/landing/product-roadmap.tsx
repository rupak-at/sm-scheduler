import { Check, Circle } from 'lucide-react';

const stages = [
  {
    title: 'Your workspace',
    description: 'Create an account, log in, and explore your personal planner.',
    available: true,
  },
  {
    title: 'Your first channel',
    description: 'Connect Instagram, Facebook Pages, TikTok or YouTube after configuring its app.',
    available: true,
  },
  {
    title: 'Your content',
    description: 'Upload a photo or MP4, write your caption and hashtags, and preview your draft.',
    available: true,
  },
  {
    title: 'Your own rhythm',
    description: 'Schedule posts and follow their publishing progress.',
    available: true,
  },
];

export function ProductRoadmap() {
  return (
    <section id="roadmap" className="scroll-mt-8 bg-canvas">
      <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <h2 className="max-w-[16ch] text-[clamp(2rem,3.5vw,3.25rem)] leading-[1.1] font-medium tracking-[-0.04em]">
            A thoughtful start.
            <br />
            More to come.
          </h2>
          <p className="max-w-[40ch] text-sm leading-6 text-muted">
            Plan Instagram, Facebook Page and TikTok content, plus videos for YouTube. Each channel
            needs its platform’s permissions; TikTok starts in private testing.
          </p>
        </div>
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {stages.map(({ title, description, available }) => (
            <li key={title} className="border-t border-line pt-6">
              <span className="flex items-center gap-2 text-xs font-medium text-muted">
                {available ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <Circle size={12} aria-hidden="true" />
                )}
                {available ? 'Available now' : 'In development'}
              </span>
              <h3 className="mt-5 text-lg font-medium tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
