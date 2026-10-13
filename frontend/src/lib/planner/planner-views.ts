export const plannerViews = [
  {
    id: 'all',
    label: 'All content',
    heading: 'Your next idea starts here',
    description:
      'Your drafts, scheduled posts, and published content will have a home here. Start with a little space to create.',
  },
  {
    id: 'drafts',
    label: 'Drafts',
    heading: 'No drafts yet',
    description:
      'A place for work in progress. Your unfinished posts will appear here as you work on them.',
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    heading: 'Nothing scheduled yet',
    description: 'Your upcoming posts will appear here when you schedule them.',
  },
  {
    id: 'published',
    label: 'Published',
    heading: 'No published posts yet',
    description:
      'Your publishing history will appear here once you begin sharing posts through Social Scheduler.',
  },
  {
    id: 'attention',
    label: 'Needs attention',
    heading: 'All caught up',
    description: 'Failed posts and unconfirmed publishing outcomes appear here.',
  },
] as const;

export type PlannerView = (typeof plannerViews)[number]['id'];

export function parsePlannerView(input: string | string[] | undefined): PlannerView {
  return plannerViews.find((view) => view.id === input)?.id ?? 'all';
}
