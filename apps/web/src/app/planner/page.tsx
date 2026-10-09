import { Planner } from '@/features/planner/components/planner';
import { parsePlannerView } from '@/features/planner/planner-views';
import { requireUser } from '@/features/auth/lib/session';
import { getWorkspace } from '@/features/planner/lib/workspace-server';

interface PageProps {
  searchParams: Promise<{ view?: string; cursor?: string; compose?: string; connection?: string }>;
}
export const metadata = { title: 'Publishing planner | Social Scheduler' };
export default async function PlannerPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const view = parsePlannerView(params.view);
  const query = new URLSearchParams({
    view,
    ...(params.cursor ? { cursor: params.cursor } : {}),
  }).toString();
  const initial = await getWorkspace(query);
  return (
    <Planner
      view={view}
      userName={user.name}
      initial={initial}
      query={query}
      {...(params.compose ? { compose: params.compose } : {})}
      {...(params.connection ? { connection: params.connection } : {})}
    />
  );
}
