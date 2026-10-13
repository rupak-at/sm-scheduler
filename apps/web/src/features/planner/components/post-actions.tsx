import Link from 'next/link';
import { MoreHorizontal, Pencil, RotateCcw, Trash2, Ban } from 'lucide-react';
import type { PlannerPost } from '@social-scheduler/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
interface ActionsProps {
  post: PlannerPost;
  act: (path: string, method?: string) => Promise<void>;
  pending: boolean;
}
export function PostActions({ post, query, act, pending }: ActionsProps & { query: string }) {
  if (!['DRAFT', 'SCHEDULED', 'CANCELLED', 'FAILED'].includes(post.status)) return null;
  return (
    <div className="mt-2 flex items-center gap-2">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-11 px-2 text-xs text-muted hover:text-ink sm:h-9"
      >
        <Link href={`/planner?${query}&compose=${post.id}`} scroll={false}>
          <Pencil className="size-3" aria-hidden="true" />
          Edit post
        </Link>
      </Button>
      <PostMenu post={post} act={act} pending={pending} />
    </div>
  );
}
function PostMenu({ post, act, pending }: ActionsProps) {
  const cancellable = ['DRAFT', 'SCHEDULED'].includes(post.status);
  const deletable = ['DRAFT', 'CANCELLED'].includes(post.status) && post.attempts.length === 0;
  const retryable = post.status === 'FAILED';
  if (!cancellable && !deletable && !retryable) return null;
  const confirm = (message: string, path: string, method?: string) => {
    if (window.confirm(message)) void act(path, method);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 text-muted sm:size-9"
          disabled={pending}
          aria-label="More post actions"
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {retryable && (
          <DropdownMenuItem
            onSelect={() =>
              confirm('Retry this failed post in one minute?', `/posts/${post.id}/retry`)
            }
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Retry in one minute
          </DropdownMenuItem>
        )}
        {cancellable && (
          <DropdownMenuItem
            onSelect={() =>
              confirm(
                'Cancel this post? It will remain in your drafts and will not be published.',
                `/posts/${post.id}/cancel`,
              )
            }
          >
            <Ban className="size-3.5" aria-hidden="true" />
            Cancel post
          </DropdownMenuItem>
        )}
        {deletable && (
          <DropdownMenuItem
            className="text-destructive"
            onSelect={() =>
              confirm('Delete this draft permanently?', `/posts/${post.id}`, 'DELETE')
            }
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete draft
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
