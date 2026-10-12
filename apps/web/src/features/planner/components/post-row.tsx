import Image from 'next/image';
import type { PlannerPost } from '@social-scheduler/shared';
import { PostActions } from './post-actions';
export function PostRow({
  post,
  query,
  act,
  pending,
}: {
  post: PlannerPost;
  query: string;
  act: (path: string, method?: string) => Promise<void>;
  pending: boolean;
}) {
  return (
    <li className="flex flex-col gap-4 p-5 sm:flex-row">
      {post.mediaMimeType === 'video/mp4' ? (
        <video
          src={post.mediaUrl}
          preload="metadata"
          muted
          playsInline
          aria-label="Reel thumbnail"
          className="size-24 rounded-lg bg-ink object-cover"
        />
      ) : (
        <Image
          src={post.mediaUrl}
          width={96}
          height={96}
          alt="Post photo"
          unoptimized
          className="size-24 rounded-lg object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-3 text-sm leading-relaxed break-words whitespace-pre-wrap">
          {post.caption || (post.mediaMimeType === 'video/mp4' ? 'Instagram Reel' : 'Photo post')}
        </p>
        <p className="mt-2 text-xs font-medium text-muted">
          {post.status.toLowerCase().replaceAll('_', ' ')}
          {post.scheduledAt &&
            ` · ${new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: post.timezone }).format(new Date(post.scheduledAt))} (${post.timezone})`}
        </p>
        {post.status === 'UNCERTAIN' && (
          <p className="mt-2 text-sm text-destructive">
            The publish outcome is unconfirmed. Check Instagram before creating another copy. The
            worker will keep checking.
          </p>
        )}
        {post.attempts[0]?.error && (
          <p className="mt-2 text-xs text-muted">
            Last attempt: {post.attempts[0].error.toLowerCase().replaceAll('_', ' ')}
          </p>
        )}
        <PostActions post={post} query={query} act={act} pending={pending} />
      </div>
    </li>
  );
}
