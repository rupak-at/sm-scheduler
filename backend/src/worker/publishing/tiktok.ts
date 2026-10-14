import { z } from 'zod';
import { tiktokSettingsSchema } from '@social-scheduler/shared';
import { bundleSchema } from '../../integrations/tiktok/schemas.js';
import { TikTokError } from '../../integrations/tiktok/http.js';
import { validateTikTokSettings } from '../../integrations/tiktok/validation.js';
import { tiktokMediaUrl } from '../../integrations/tiktok/media-url.js';
import { eligibleChannelWhere } from '../../lib/channel-eligibility.js';
import type { PublishingServices } from './processor.js';
import type { ClaimedPublication } from './claim.js';
import { finishPublication, deferPublication } from './outcomes.js';

type Services = PublishingServices & { tiktok: NonNullable<PublishingServices['tiktok']> };
const metadataSchema = z.object({ tiktok: tiktokSettingsSchema, consentedAt: z.iso.datetime() });
export async function publishTikTok(services: Services, record: ClaimedPublication) {
  const { db, tiktok } = services;
  const media = record.post.media[0]?.mediaAsset;
  if (
    record.socialAccount.userId !== record.post.userId ||
    record.post.media.length !== 1 ||
    !media ||
    media.userId !== record.post.userId ||
    media.status !== 'READY' ||
    !(
      (media.type === 'IMAGE' && media.mimeType === 'image/jpeg') ||
      (media.type === 'VIDEO' && media.mimeType === 'video/mp4')
    )
  )
    throw new TikTokError('INVALID_PUBLICATION_OWNERSHIP');
  const token = await tiktok.tokens.validToken(record.socialAccountId);
  if (record.publishRequestedAt) {
    if (record.externalContainerId)
      await pollTikTok(services, record, token, record.externalContainerId);
    else await finishPublication(db, record, 'UNCERTAIN', 'CHECK_TIKTOK_OUTCOME');
    return;
  }
  const parsed = metadataSchema.safeParse(record.providerMetadata);
  if (!parsed.success) throw new TikTokError('CONSENT_REQUIRED');
  const settings = parsed.data.tiktok;
  validateTikTokSettings(settings, await tiktok.client.creatorInfo(token), tiktok.audited, media);
  const account = await db.socialAccount.findUniqueOrThrow({
    where: { id: record.socialAccountId },
  });
  if (
    !account.tokenCiphertext ||
    bundleSchema.parse(
      JSON.parse(
        tiktok.vault.open(
          account.tokenCiphertext,
          account.providerAccountId,
          account.tokenKeyVersion,
        ),
      ),
    ).accessToken !== token
  )
    throw new TikTokError('CONNECTION_CHANGED');
  const url = tiktokMediaUrl(tiktok.mediaOrigin, tiktok.signingKey, record.id, media.id);
  const marked = await db.publication.updateMany({
    where: {
      id: record.id,
      leaseToken: record.leaseToken,
      leaseExpiresAt: { gt: new Date() },
      status: 'PROCESSING',
      publishRequestedAt: null,
      socialAccount: {
        userId: record.post.userId,
        ...eligibleChannelWhere(['TIKTOK']),
        tokenCiphertext: { equals: account.tokenCiphertext },
      },
    },
    data: { publishRequestedAt: new Date() },
  });
  if (marked.count !== 1) throw new TikTokError('CONNECTION_CHANGED');
  const result = await tiktok.client.publish(
    token,
    url,
    record.captionOverride ?? record.post.caption,
    settings,
    media.type === 'VIDEO',
  );
  const saved = await db.publication.updateMany({
    where: {
      id: record.id,
      leaseToken: record.leaseToken,
      leaseExpiresAt: { gt: new Date() },
    },
    data: { externalContainerId: result.publish_id },
  });
  if (saved.count === 1) await pollTikTok(services, record, token, result.publish_id);
}
async function pollTikTok(
  { db, tiktok }: Services,
  record: ClaimedPublication,
  token: string,
  publishId: string,
) {
  try {
    const result = await tiktok.client.status(token, publishId);
    if (result.status === 'PUBLISH_COMPLETE')
      await finishPublication(
        db,
        record,
        'PUBLISHED',
        undefined,
        result.publicaly_available_post_id?.[0],
      );
    else if (result.status === 'FAILED')
      await finishPublication(db, record, 'FAILED', 'TIKTOK_PROCESSING_FAILED');
    else if (result.status === 'SEND_TO_USER_INBOX')
      await finishPublication(db, record, 'UNCERTAIN', 'CHECK_TIKTOK_INBOX');
    else if (Date.now() - (record.publishRequestedAt?.getTime() ?? Date.now()) > 6 * 3600000)
      await finishPublication(db, record, 'UNCERTAIN', 'CHECK_TIKTOK_OUTCOME');
    else await deferPublication(db, record);
  } catch (error) {
    if (
      error instanceof TikTokError &&
      ['PROVIDER_UNAVAILABLE', 'RATE_LIMITED'].includes(error.code)
    ) {
      await deferPublication(db, record);
      return;
    }
    throw error;
  }
}
