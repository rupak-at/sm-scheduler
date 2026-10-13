import type { Channel, PlannerPost } from '@social-scheduler/shared';
import { PostActions } from './post-actions';
import { PostMedia } from './post-media';
import { PostStatus } from './post-status';
export function PostRow({
  post,
  channels,
  query,
  act,
  pending,
}: {
  post: PlannerPost;
  channels: Channel[];
  query: string;
  act: (path: string, method?: string) => Promise<void>;
  pending: boolean;
}) {
  const date = post.status === 'PUBLISHED' ? post.publishedAt : post.scheduledAt;
  const channel = channels.find((item) => item.id === post.socialAccountId);
  return (
    <li className="p-4 hover:bg-canvas/60 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <PostMedia post={post} className="size-16 sm:size-20" />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[11px] text-muted">
              {post.mediaMimeType === 'video/mp4' ? 'Reel' : 'Photo'} · @
              {channel?.displayName ?? 'Instagram'}
            </p>
            <PostStatus status={post.status} />
          </div>
          <p className="line-clamp-2 text-[13px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap sm:text-sm">
            {post.caption || (post.mediaMimeType === 'video/mp4' ? 'Instagram Reel' : 'Photo post')}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
            {date && (
              <p className="mt-2 text-xs leading-relaxed text-muted">
                <time dateTime={date}>
                  {new Intl.DateTimeFormat('en', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: post.timezone,
                  }).format(new Date(date))}
                </time>
                <span className="ml-1 text-[11px]">({post.timezone})</span>
              </p>
            )}
            <PostActions post={post} query={query} act={act} pending={pending} />
          </div>
        </div>
      </div>
      {post.status === 'UNCERTAIN' && (
        <p className="mt-3 rounded-lg bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">
          The publish outcome is unconfirmed. Check Instagram before creating another copy. We’ll
          keep checking.
        </p>
      )}
      {post.attempts[0]?.error && (
        <p className="mt-3 text-xs text-destructive">
          Last attempt: {post.attempts[0].error.toLowerCase().replaceAll('_', ' ')}
        </p>
      )}
    </li>
  );
}
