import type { Channel, PlannerPost } from '@social-scheduler/shared';
import { PostActions } from '@/components/planner/post-actions';
import { PostMedia } from '@/components/planner/post-media';
import { PostStatus } from '@/components/planner/post-status';
import { channelName, channelProvider } from '@/lib/planner/channels';
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
    <li className="p-4 sm:p-6">
      <div className="flex items-start gap-4 sm:gap-5">
        <PostMedia post={post} className="h-24 w-16 rounded-lg sm:h-28 sm:w-20" />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs font-medium text-muted">
              {channelProvider(channel)} · {channelName(channel)}
              <span className="ml-2 font-normal">
                {post.mediaMimeType === 'video/mp4'
                  ? channel?.provider !== 'INSTAGRAM'
                    ? 'Video'
                    : 'Reel'
                  : 'Photo'}
                {post.tiktokSettings?.privacy === 'SELF_ONLY' && ' · Only me'}
                {post.youtubeSettings?.privacy && ` · ${post.youtubeSettings.privacy}`}
              </span>
            </p>
            <PostStatus status={post.status} />
          </div>
          {post.youtubeSettings?.title && (
            <p className="mb-1 truncate text-sm font-medium">{post.youtubeSettings.title}</p>
          )}
          <p className="line-clamp-3 text-[13px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap sm:text-sm">
            {post.caption || (post.mediaMimeType === 'video/mp4' ? 'Video post' : 'Photo post')}
          </p>
          {date && (
            <p className="mt-3 text-xs leading-relaxed text-muted">
              {post.status === 'PUBLISHED' ? 'Published ' : 'Scheduled '}
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
          <PostActions
            post={post}
            query={query}
            act={act}
            pending={pending}
            provider={channel?.provider}
          />
        </div>
      </div>
      {post.status === 'UNCERTAIN' && (
        <p className="mt-4 rounded-lg bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">
          The publish outcome is unconfirmed. Check {channelProvider(channel)} before creating
          another copy. We’ll keep checking.
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
