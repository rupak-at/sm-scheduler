import type { PrismaClient } from '../../database/index.js';
import { InstagramError } from '../../integrations/instagram/http.js';
import { FacebookError } from '../../integrations/facebook/http.js';
import type { InstagramClient } from '../../integrations/instagram/client.js';
import type { AccountTokens } from '../../integrations/instagram/account-tokens.js';
import type { createFacebookServices } from '../../integrations/facebook/services.js';
import type { MediaStorage } from '../../lib/media/media-storage.types.js';
import { claimPublication } from './claim.js';
import { finishPublication, deferPublication } from './outcomes.js';
import { publishInstagram } from './instagram.js';
import { publishFacebook } from './facebook.js';
import { publishTikTok } from './tiktok.js';
import { TikTokError } from '../../integrations/tiktok/http.js';
import type { TikTokServices } from '../../integrations/tiktok/services.js';
import { YouTubeError } from '../../integrations/youtube/http.js';
import type { YouTubeServices } from '../../integrations/youtube/services.js';
import { publishYouTube } from './youtube.js';

export interface PublishingServices {
  db: PrismaClient;
  client?: InstagramClient;
  tokens?: AccountTokens;
  facebook?: NonNullable<ReturnType<typeof createFacebookServices>>;
  storage: MediaStorage;
  tiktok?: TikTokServices;
  youtube?: YouTubeServices;
}
export function createPublicationProcessor(services: PublishingServices) {
  return async (id: string) => {
    const record = await claimPublication(services.db, id);
    if (!record) return;
    try {
      if (record.socialAccount.provider === 'YOUTUBE') {
        if (!services.youtube) throw new YouTubeError('PROVIDER_NOT_CONFIGURED');
        await publishYouTube({ ...services, youtube: services.youtube }, record);
      } else if (record.socialAccount.provider === 'TIKTOK') {
        if (!services.tiktok) throw new TikTokError('PROVIDER_NOT_CONFIGURED');
        await publishTikTok({ ...services, tiktok: services.tiktok }, record);
      } else if (record.socialAccount.provider === 'FACEBOOK') {
        if (!services.facebook) throw new FacebookError('PROVIDER_NOT_CONFIGURED');
        await publishFacebook({ ...services, facebook: services.facebook }, record);
      } else if (record.socialAccount.provider === 'INSTAGRAM') {
        if (!services.client || !services.tokens)
          throw new InstagramError('PROVIDER_NOT_CONFIGURED');
        await publishInstagram(
          { ...services, client: services.client, tokens: services.tokens },
          record,
        );
      } else throw new Error('Unsupported publishing provider');
    } catch (error) {
      const requested = await services.db.publication.findUnique({
        where: { id },
        select: { publishRequestedAt: true, externalContainerId: true },
      });
      const code =
        error instanceof InstagramError ||
        error instanceof FacebookError ||
        error instanceof TikTokError ||
        error instanceof YouTubeError
          ? error.code
          : 'PUBLISHING_UNAVAILABLE';
      if (
        !requested?.publishRequestedAt &&
        ['PROVIDER_UNAVAILABLE', 'CONNECTION_CHANGED', 'RATE_LIMITED'].includes(code) &&
        Date.now() - (record.attempts[0]?.startedAt.getTime() ?? Date.now()) < 600000
      ) {
        await deferPublication(services.db, record);
        return;
      }
      // Clear the send marker only when Facebook/TikTok explicitly rejected this
      // request. Network, malformed, and 5xx outcomes retain their duplicate guard.
      const rejected =
        (error instanceof FacebookError || error instanceof TikTokError) &&
        !error.uncertain &&
        [
          'TOKEN_REVOKED',
          'PERMISSION_REQUIRED',
          'RATE_LIMITED',
          'PROVIDER_REJECTED',
          'MEDIA_DOMAIN_UNVERIFIED',
          'PRIVATE_TEST_ACCOUNT_REQUIRED',
          'CREATOR_POSTING_UNAVAILABLE',
        ].includes(code) &&
        !record.publishRequestedAt &&
        !requested?.externalContainerId;
      if (rejected)
        await services.db.publication.updateMany({
          where: { id, leaseToken: record.leaseToken, leaseExpiresAt: { gt: new Date() } },
          data: { publishRequestedAt: null },
        });
      await finishPublication(
        services.db,
        record,
        requested?.publishRequestedAt && !rejected ? 'UNCERTAIN' : 'FAILED',
        code,
      );
    }
  };
}
