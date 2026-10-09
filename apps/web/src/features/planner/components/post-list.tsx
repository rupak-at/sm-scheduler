import { PostRow } from './post-row';
import type { PlannerPost } from '@social-scheduler/shared';

export function PostList({
  posts,
  query,
  act,
  pending,
}: {
  posts: PlannerPost[];
  query: string;
  act: (path: string, method?: string) => Promise<void>;
  pending: boolean;
}) {
  if (!posts.length)
    return (
      <div className="px-6 py-16 text-center">
        <h2 className="text-lg font-medium">A place for your next post</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
          Connect Instagram, add a photo, and save a draft or choose when to share it.
        </p>
      </div>
    );
  return (
    <ul className="divide-y divide-line">
      {posts.map((post) => (
        <PostRow key={post.id} post={post} query={query} act={act} pending={pending} />
      ))}
    </ul>
  );
}
