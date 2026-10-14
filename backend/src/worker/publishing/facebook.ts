import { FacebookError } from '../../integrations/facebook/http.js';
import { eligibleChannelWhere } from '../../lib/channel-eligibility.js';
import type { PublishingServices } from './processor.js';
import type { ClaimedPublication } from './claim.js';
import { finishPublication, deferPublication } from './outcomes.js';

export async function publishFacebook(
  services: PublishingServices & { facebook: NonNullable<PublishingServices['facebook']> },
  record: ClaimedPublication,
) {
  const { db, facebook, storage } = services;
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
    throw new FacebookError('INVALID_PUBLICATION_OWNERSHIP');
  const token = await facebook.tokens.validToken(record.socialAccountId);
  if (record.publishRequestedAt) {
    if (record.externalContainerId && media.type === 'VIDEO')
      await reconcileFacebookVideo(services, record, record.externalContainerId, token);
    else await finishPublication(db, record, 'UNCERTAIN', 'CHECK_FACEBOOK_OUTCOME');
    return;
  }
  const url = storage.publicMediaUrl(
    media.id,
    media.type === 'VIDEO' ? 'mp4' : 'jpg',
    media.storageKey,
  );
  const marked = await db.publication.updateMany({
    where: {
      id: record.id,
      leaseToken: record.leaseToken,
      leaseExpiresAt: { gt: new Date() },
      status: 'PROCESSING',
      publishRequestedAt: null,
      socialAccount: {
        userId: record.post.userId,
        ...eligibleChannelWhere(['FACEBOOK']),
        tokenCiphertext: { equals: record.socialAccount.tokenCiphertext! },
      },
    },
    data: { publishRequestedAt: new Date() },
  });
  if (marked.count !== 1) throw new FacebookError('CONNECTION_CHANGED');
  const caption = record.captionOverride ?? record.post.caption;
  if (media.type === 'IMAGE') {
    const result = await facebook.client.publishPhoto(
      record.socialAccount.providerAccountId,
      token,
      url,
      caption,
    );
    await finishPublication(db, record, 'PUBLISHED', undefined, result.post_id);
    return;
  }
  const result = await facebook.client.publishVideo(
    record.socialAccount.providerAccountId,
    token,
    url,
    caption,
  );
  const saved = await db.publication.updateMany({
    where: { id: record.id, leaseToken: record.leaseToken, leaseExpiresAt: { gt: new Date() } },
    data: { externalContainerId: result.id },
  });
  if (saved.count !== 1) return;
  await reconcileFacebookVideo(services, record, result.id, token);
}

async function reconcileFacebookVideo(
  { db, facebook }: PublishingServices & { facebook: NonNullable<PublishingServices['facebook']> },
  record: ClaimedPublication,
  videoId: string,
  token: string,
) {
  try {
    const video = await facebook.client.videoStatus(videoId, token);
    if (video.id !== videoId) throw new FacebookError('INVALID_PROVIDER_RESPONSE');
    if (video.published && video.status.video_status === 'ready')
      await finishPublication(db, record, 'PUBLISHED', undefined, videoId);
    else if (
      video.status.video_status === 'error' ||
      video.status.publishing_phase?.status === 'error'
    )
      await finishPublication(db, record, 'FAILED', 'FACEBOOK_VIDEO_PROCESSING_FAILED');
    else if (Date.now() - (record.publishRequestedAt?.getTime() ?? Date.now()) > 3600000)
      await finishPublication(db, record, 'UNCERTAIN', 'CHECK_FACEBOOK_VIDEO_OUTCOME');
    else await deferPublication(db, record);
  } catch (error) {
    if (
      error instanceof FacebookError &&
      ['PROVIDER_UNAVAILABLE', 'RATE_LIMITED'].includes(error.code)
    ) {
      await deferPublication(db, record);
      return;
    }
    throw error;
  }
}
