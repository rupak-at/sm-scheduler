'use client';
import Link from 'next/link';
import { WorkspaceLayout } from './workspace-layout';
import { PlannerHeader } from './planner-header';
import type { z } from 'zod';
import type { workspaceSchema } from '@social-scheduler/shared';
import { Button } from '@/components/ui/button';
import { ContentFilters } from './content-filters';
import { ChannelsPanel } from './channels-panel';
import { PostList } from './post-list';
import { PostEditor } from './post-editor';
import { ConnectionNotice } from './connection-notice';
import { useWorkspace } from '../hooks/use-workspace';
import type { PlannerView } from '../planner-views';

export function Planner({
  view,
  userName,
  initial,
  query,
  compose,
  connection,
}: {
  view: PlannerView;
  userName: string;
  initial: z.infer<typeof workspaceSchema>;
  query: string;
  compose?: string;
  connection?: string;
}) {
  const { data, refresh, act, error, pending } = useWorkspace(initial, query);
  const post = data.posts.find((item) => item.id === compose);
  const canCompose = data.channels.length > 0;
  return (
    <WorkspaceLayout
      userName={userName}
      connected={data.channels.some((channel) => channel.status === 'CONNECTED')}
    >
      <PlannerHeader canCompose={canCompose} query={query} />
      <ConnectionNotice code={connection} />
      <p role="alert" className="mb-4 text-sm text-destructive empty:hidden">
        {error}
      </p>
      {compose && canCompose && (compose === 'new' || post) && (
        <PostEditor key={post?.id ?? 'new'} channels={data.channels} {...(post ? { post } : {})} />
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section
          className="min-w-0 overflow-hidden rounded-xl border border-line bg-paper"
          aria-label="Your content"
        >
          <ContentFilters view={view} />
          <PostList posts={data.posts} query={query} act={act} pending={pending} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => void refresh()}>
              Refresh status
            </Button>
            {data.nextCursor && (
              <Link
                href={`/planner?view=${view}&cursor=${data.nextCursor}`}
                className="rounded px-3 py-2 text-sm hover:bg-surface"
              >
                Next page
              </Link>
            )}
            {query.includes('cursor=') && (
              <Link
                href={`/planner?view=${view}`}
                className="rounded px-3 py-2 text-sm hover:bg-surface"
              >
                First page
              </Link>
            )}
          </div>
        </section>
        <ChannelsPanel
          channels={data.channels}
          configured={data.instagramConfigured}
          act={act}
          pending={pending}
        />
      </div>
    </WorkspaceLayout>
  );
}
