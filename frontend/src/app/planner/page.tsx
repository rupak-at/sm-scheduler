import { Planner } from '@/components/planner/planner';
import { parsePlannerView } from '@/lib/planner/planner-views';
import { requireUser } from '@/lib/auth/session';
import { getWorkspace } from '@/lib/planner/workspace-server';

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
      {...(params.connection ? { connection: params.connection } : {})}
    />
  );
}
