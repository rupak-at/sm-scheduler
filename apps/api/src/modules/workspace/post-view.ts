import type { PrismaClient } from '@social-scheduler/database';
import { postSchema } from '@social-scheduler/shared';
import type { PlannerPost } from '@social-scheduler/shared';

export const postInclude = {
  media: {
    orderBy: { position: 'asc' as const },
    include: { mediaAsset: { select: { mimeType: true } } },
  },
  publications: {
    include: { attempts: { orderBy: { attemptNumber: 'desc' as const }, take: 5 } },
  },
};
type StoredPost = Awaited<ReturnType<PrismaClient['post']['findMany']>>[number];
type PostDetails = StoredPost & {
  media: { mediaAssetId: string; mediaAsset: { mimeType: string } }[];
  publications: {
    id: string;
    socialAccountId: string;
    status: string;
    scheduledAt: Date | null;
    publishedAt: Date | null;
    timezone: string;
    externalPostId: string | null;
    attempts: { attemptNumber: number; status: string; errorCode: string | null }[];
  }[];
};
export function postView(post: PostDetails): PlannerPost {
  const publication = post.publications[0];
  const media = post.media[0];
  if (!publication || !media) throw new Error('Incomplete stored post');
  return postSchema.parse({
    id: post.id,
    caption: post.caption,
    updatedAt: post.updatedAt.toISOString(),
    mediaAssetId: media.mediaAssetId,
    mediaUrl: `/api/workspace/media/${media.mediaAssetId}`,
    mediaMimeType: media.mediaAsset.mimeType,
    publicationId: publication.id,
    socialAccountId: publication.socialAccountId,
    status: publication.status,
    scheduledAt: publication.scheduledAt?.toISOString() ?? null,
    publishedAt: publication.publishedAt?.toISOString() ?? null,
    timezone: publication.timezone,
    externalPostId: publication.externalPostId,
    attempts: publication.attempts.map((attempt) => ({
      number: attempt.attemptNumber,
      status: attempt.status,
      error: attempt.errorCode,
    })),
  });
}
