import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { PlannerPost, Channel } from '@social-scheduler/shared';
import { PostMedia } from '@/components/planner/post-media';
import { channelName, channelProvider } from '@/lib/planner/channels';

export function UpcomingPosts({ posts, channels }: { posts: PlannerPost[]; channels: Channel[] }) {
  return (
    <section
      aria-labelledby="upcoming-heading"
      className="min-w-0 rounded-xl border border-line bg-paper p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="upcoming-heading" className="text-[15px] font-semibold">
          Up next
        </h2>
        <Link
          href="/planner?view=scheduled"
          className="flex min-h-11 items-center gap-1 rounded-md text-xs text-muted hover:text-ink"
        >
          View queue
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      {posts.length ? (
        <ol className="mt-2 space-y-5">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/planner?view=scheduled&compose=${post.id}`}
                className="group flex items-start gap-3 rounded-lg"
              >
                <PostMedia post={post} className="size-12" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium group-hover:underline">
                    {post.caption ||
                      (post.mediaMimeType === 'video/mp4' ? 'Video post' : 'Photo post')}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {post.scheduledAt &&
                      new Intl.DateTimeFormat('en', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: post.timezone,
                      }).format(new Date(post.scheduledAt))}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-muted">
                    {channelProvider(channels.find((c) => c.id === post.socialAccountId))} ·{' '}
                    {channelName(channels.find((c) => c.id === post.socialAccountId))} ·{' '}
                    {post.timezone}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-2 border-t border-line pt-4 pb-1">
          <p className="text-[13px] font-medium">Your queue is clear.</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Schedule a post when you’re ready. Your next publications will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
