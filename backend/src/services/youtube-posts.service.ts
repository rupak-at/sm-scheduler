import { youtubeSettingsSchema, youtubeSchedulingProblem } from '@social-scheduler/shared';
import type { PostInput } from '@social-scheduler/shared';
import type { PrismaClient } from '../database/index.js';
import type { YouTubeServices } from '../integrations/youtube/services.js';
import { WorkspaceError } from '../lib/workspace-error.js';
import { YouTubeError } from '../integrations/youtube/http.js';

export async function prepareYouTubePost(
  db: PrismaClient,
  services: YouTubeServices | undefined,
  userId: string,
  input: PostInput,
) {
  const account = await db.socialAccount.findFirst({
    where: { id: input.socialAccountId, userId },
  });
  if (account?.provider !== 'YOUTUBE') return null;
  const media = await db.mediaAsset.findFirst({
    where: {
      id: input.mediaAssetId,
      userId,
      status: 'READY',
      type: 'VIDEO',
      mimeType: 'video/mp4',
    },
  });
  if (!media)
    throw new WorkspaceError(422, 'YouTube requires an uploaded MP4 video from your workspace.');
  const settings = youtubeSettingsSchema.parse(input.youtubeSettings ?? {});
  if (input.scheduledAt) {
    if (!services) throw new YouTubeError('PROVIDER_NOT_CONFIGURED');
    const problem = youtubeSchedulingProblem(settings, input.caption);
    if (problem) throw new WorkspaceError(422, problem);
    await services.tokens.validToken(account.id);
  }
  return {
    youtube: settings,
    ...(input.scheduledAt ? { youtubeConsentedAt: new Date().toISOString() } : {}),
  };
}
