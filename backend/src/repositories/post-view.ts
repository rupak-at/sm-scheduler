import type { PrismaClient } from '../database/index.js';
import { postSchema, tiktokSettingsSchema } from '@social-scheduler/shared';
import type { PlannerPost } from '@social-scheduler/shared';

export const postInclude = {
  media: {
    orderBy: { position: 'asc' as const },
    include: { mediaAsset: { select: { mimeType: true, durationSeconds: true } } },
  },
  publications: {
    include: { attempts: { orderBy: { attemptNumber: 'desc' as const }, take: 5 } },
  },
};
type StoredPost = Awaited<ReturnType<PrismaClient['post']['findMany']>>[number];
type PostDetails = StoredPost & {
  media: {
    mediaAssetId: string;
    mediaAsset: { mimeType: string; durationSeconds: number | null };
  }[];
  publications: {
    id: string;
    socialAccountId: string;
    status: string;
    scheduledAt: Date | null;
    publishedAt: Date | null;
    timezone: string;
    externalPostId: string | null;
    providerMetadata: unknown;
    publishRequestedAt: Date | null;
    attempts: { attemptNumber: number; status: string; errorCode: string | null }[];
  }[];
};
export function postView(post: PostDetails): PlannerPost {
  const publication = post.publications[0];
  const media = post.media[0];
  if (!publication || !media) throw new Error('Incomplete stored post');
  const metadata = publication.providerMetadata;
  const tiktok =
    metadata && typeof metadata === 'object' && 'tiktok' in metadata
      ? tiktokSettingsSchema.safeParse(metadata.tiktok)
      : null;
  return postSchema.parse({
    id: post.id,
    editable:
      ['DRAFT', 'SCHEDULED', 'CANCELLED', 'FAILED'].includes(publication.status) &&
      publication.publishRequestedAt === null,
    caption: post.caption,
    updatedAt: post.updatedAt.toISOString(),
    mediaAssetId: media.mediaAssetId,
    mediaUrl: `/api/workspace/media/${media.mediaAssetId}`,
    mediaMimeType: media.mediaAsset.mimeType,
    mediaDurationSeconds: media.mediaAsset.durationSeconds,
    ...(tiktok?.success ? { tiktokSettings: { ...tiktok.data, consent: false } } : {}),
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
