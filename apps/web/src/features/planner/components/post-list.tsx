import Link from 'next/link';
import { ImagePlus, Plus } from 'lucide-react';
import { PostRow } from './post-row';
import { Button } from '@/components/ui/button';
import { plannerViews, type PlannerView } from '../planner-views';
import type { Channel, PlannerPost } from '@social-scheduler/shared';
export function PostList({
  posts,
  channels,
  view,
  query,
  act,
  pending,
}: {
  posts: PlannerPost[];
  channels: Channel[];
  view: PlannerView;
  query: string;
  act: (path: string, method?: string) => Promise<void>;
  pending: boolean;
}) {
  const empty = plannerViews.find((item) => item.id === view)!;
  if (!posts.length)
    return (
      <div className="flex min-h-[330px] flex-col items-center justify-center px-5 py-10 text-center sm:min-h-[380px]">
        <span className="mb-5 grid size-14 place-items-center rounded-2xl border border-line bg-canvas">
          <ImagePlus className="size-6 text-muted" strokeWidth={1.4} aria-hidden="true" />
        </span>
        <h3 className="text-lg font-medium tracking-tight">{empty.heading}</h3>
        <p className="mt-2 max-w-72 text-[13px] leading-relaxed text-muted">
          {channels.length
            ? empty.description
            : 'Connect Instagram to add a photo or Reel, save a draft, and choose when to share it.'}
        </p>
        <Button
          asChild
          className="mt-5 h-11 rounded-xl"
          variant={channels.length ? 'default' : 'outline'}
        >
          <Link
            href={channels.length ? `/planner?${query}&compose=new` : '#channels'}
            scroll={false}
          >
            <Plus aria-hidden="true" />
            {channels.length ? 'Create a post' : 'Connect Instagram'}
          </Link>
        </Button>
      </div>
    );
  return (
    <ul className="divide-y divide-line/80">
      {posts.map((post) => (
        <PostRow
          key={post.id}
          post={post}
          channels={channels}
          query={query}
          act={act}
          pending={pending}
        />
      ))}
    </ul>
  );
}
