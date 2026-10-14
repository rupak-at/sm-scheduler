import { tiktokSettingsSchema } from '@social-scheduler/shared';
import type { PostInput } from '@social-scheduler/shared';
import type { PrismaClient } from '../database/index.js';
import type { TikTokServices } from '../integrations/tiktok/services.js';
import { TikTokError } from '../integrations/tiktok/http.js';
import { validateTikTokSettings } from '../integrations/tiktok/validation.js';
import { findPostInputs } from '../repositories/post-input.repository.js';

export async function prepareTikTokPost(
  db: PrismaClient,
  services: TikTokServices | undefined,
  userId: string,
  input: PostInput,
) {
  const { account, media } = await findPostInputs(db, userId, input);
  if (account?.provider !== 'TIKTOK') return null;
  const settings = tiktokSettingsSchema.parse(input.tiktokSettings ?? {});
  if (input.scheduledAt) {
    if (!services) throw new TikTokError('PROVIDER_NOT_CONFIGURED');
    if (!media) throw new TikTokError('INVALID_PUBLICATION_OWNERSHIP');
    const token = await services.tokens.validToken(account.id);
    validateTikTokSettings(
      settings,
      await services.client.creatorInfo(token),
      services.audited,
      media,
    );
  }
  return {
    tiktok: settings,
    ...(input.scheduledAt ? { consentedAt: new Date().toISOString() } : {}),
  };
}
