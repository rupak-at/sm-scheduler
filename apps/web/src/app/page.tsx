import { Planner } from '@/features/planner/components/planner';
import { parsePlannerView } from '@/features/planner/planner-views';
import { requireUser } from '@/features/auth/lib/session';

interface PageProps {
  searchParams: Promise<{ view?: string | string[] }>;
}

export default async function Home({ searchParams }: PageProps) {
  const user = await requireUser();
  const { view } = await searchParams;
  return <Planner view={parsePlannerView(view)} userName={user.name} />;
}
