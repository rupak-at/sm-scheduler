'use client';
import { useSearchParams } from 'next/navigation';
import type { z } from 'zod';
import type { workspaceSchema } from '@social-scheduler/shared';
import { WorkspaceLayout } from '@/components/planner/workspace-layout';
import { PlannerHeader } from '@/components/planner/planner-header';
import { ContentPanel } from '@/components/planner/content-panel';
import { UpcomingPosts } from '@/components/planner/upcoming-posts';
import { ChannelsPanel } from '@/components/planner/channels-panel';
import { PostEditor } from '@/components/planner/post-editor';
import { ConnectionNotice } from '@/components/planner/connection-notice';
import { useWorkspace } from '@/hooks/planner/use-workspace';
import type { PlannerView } from '@/lib/planner/planner-views';

export function Planner({
  view,
  userName,
  initial,
  query,
  connection,
}: {
  view: PlannerView;
  userName: string;
  initial: z.infer<typeof workspaceSchema>;
  query: string;
  connection?: string;
}) {
  const { data, refresh, act, error, pending } = useWorkspace(initial, query);
  const compose = useSearchParams().get('compose');
  const post = [...data.posts, ...data.upcoming].find((item) => item.id === compose);
  const canCompose = data.channels.length > 0;
  return (
    <WorkspaceLayout
      userName={userName}
      connected={data.channels.some((channel) => channel.status === 'CONNECTED')}
    >
      <PlannerHeader canCompose={canCompose} query={query} />
      <ConnectionNotice code={connection} />
      <p
        role="alert"
        className="mb-4 rounded-xl bg-destructive/5 p-3 text-sm text-destructive empty:hidden"
      >
        {error}
      </p>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_288px] lg:gap-7">
        <ContentPanel
          data={data}
          view={view}
          query={query}
          act={act}
          pending={pending}
          refresh={refresh}
        />
        <aside
          className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1"
          aria-label="Publishing overview"
        >
          <ChannelsPanel
            channels={data.channels}
            configured={data.instagramConfigured}
            facebookConfigured={data.facebookConfigured}
            tiktokConfigured={data.tiktokConfigured}
            youtubeConfigured={data.youtubeConfigured}
            act={act}
            pending={pending}
          />
          <UpcomingPosts posts={data.upcoming} channels={data.channels} />
        </aside>
      </div>
      {compose && canCompose && (compose === 'new' || post) && (
        <PostEditor
          key={post?.id ?? 'new'}
          channels={data.channels}
          closeHref={`/planner?${query}`}
          {...(post ? { post } : {})}
        />
      )}
    </WorkspaceLayout>
  );
}
