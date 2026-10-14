import type { Prisma, SocialAccount, MediaAsset } from '../database/index.js';
import type { PostInput } from '@social-scheduler/shared';

export async function findPostInputs(
  tx: Prisma.TransactionClient,
  userId: string,
  input: PostInput,
): Promise<{ account: SocialAccount | null; media: MediaAsset | null }> {
  const account = await tx.socialAccount.findFirst({
    where: {
      id: input.socialAccountId,
      userId,
      provider: { in: ['INSTAGRAM', 'FACEBOOK', 'TIKTOK'] },
    },
  });
  const media = await tx.mediaAsset.findFirst({
    where: {
      id: input.mediaAssetId,
      userId,
      status: 'READY',
      OR: [
        { type: 'IMAGE', mimeType: 'image/jpeg' },
        { type: 'VIDEO', mimeType: 'video/mp4' },
      ],
    },
  });
  return { account, media };
}
