import Image from 'next/image';
import { Clapperboard } from 'lucide-react';
import type { PlannerPost } from '@social-scheduler/shared';
import { cn } from '@/lib/utils';

export function PostMedia({ post, className }: { post: PlannerPost; className?: string }) {
  return (
    <div className={cn('relative shrink-0 overflow-hidden rounded-xl bg-surface', className)}>
      {post.mediaMimeType === 'video/mp4' ? (
        <>
          <video
            src={post.mediaUrl}
            preload="metadata"
            muted
            playsInline
            aria-label="Reel thumbnail"
            className="size-full object-cover"
          />
          <span className="absolute right-1 bottom-1 rounded-md bg-ink/75 p-1 text-paper">
            <Clapperboard className="size-3" aria-hidden="true" />
          </span>
        </>
      ) : (
        <Image
          src={post.mediaUrl}
          fill
          sizes="80px"
          alt="Post photo"
          unoptimized
          className="object-cover"
        />
      )}
    </div>
  );
}
