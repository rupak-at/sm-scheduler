export const plannerViews = [
  { id: 'all', label: 'All content', heading: 'Make room for your next idea.' },
  { id: 'drafts', label: 'Drafts', heading: 'Your ideas start here.' },
  { id: 'scheduled', label: 'Scheduled', heading: 'A little planning goes a long way.' },
  { id: 'published', label: 'Published', heading: 'Your published story starts here.' },
] as const;

export type PlannerView = (typeof plannerViews)[number]['id'];

export function parsePlannerView(input: string | string[] | undefined): PlannerView {
  return plannerViews.find((view) => view.id === input)?.id ?? 'all';
}
