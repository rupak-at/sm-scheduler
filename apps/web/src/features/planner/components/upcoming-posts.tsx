import Link from 'next/link';
import { CalendarClock, ArrowUpRight } from 'lucide-react';
import type { PlannerPost, Channel } from '@social-scheduler/shared';
import { PostMedia } from './post-media';

export function UpcomingPosts({ posts, channels }: { posts: PlannerPost[]; channels: Channel[] }) {
  return (
    <section
      aria-labelledby="upcoming-heading"
      className="min-w-0 rounded-2xl border border-line bg-paper p-5 shadow-xs"
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
                      (post.mediaMimeType === 'video/mp4' ? 'Instagram Reel' : 'Photo post')}
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
                    @
                    {channels.find((c) => c.id === post.socialAccountId)?.displayName ??
                      'Instagram'}{' '}
                    · {post.timezone}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-3 rounded-xl bg-canvas px-4 py-6">
          <CalendarClock className="mb-3 size-5 text-muted" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-sm font-medium">Your next post starts here.</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Choose a time when you create a post. Your next publications will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
