import Link from 'next/link';
import type { PlannerPost } from '@social-scheduler/shared';
import { Button } from '@/components/ui/button';
export function PostActions({
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
    <div className="mt-3 flex flex-wrap gap-2">
      {['DRAFT', 'SCHEDULED', 'CANCELLED', 'FAILED'].includes(post.status) && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/planner?${query}&compose=${post.id}`}>Edit post</Link>
        </Button>
      )}
      {['DRAFT', 'SCHEDULED'].includes(post.status) && (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (
              window.confirm(
                'Cancel this post? It will remain in your drafts and will not be published.',
              )
            )
              void act(`/posts/${post.id}/cancel`);
          }}
        >
          Cancel post
        </Button>
      )}
      {post.status === 'FAILED' && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (window.confirm('Retry this failed post in one minute?'))
              void act(`/posts/${post.id}/retry`);
          }}
        >
          Retry in one minute
        </Button>
      )}
      {['DRAFT', 'CANCELLED'].includes(post.status) && post.attempts.length === 0 && (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (window.confirm('Delete this draft permanently?'))
              void act(`/posts/${post.id}`, 'DELETE');
          }}
        >
          Delete draft
        </Button>
      )}
    </div>
  );
}
