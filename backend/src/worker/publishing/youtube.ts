import { z } from 'zod';
import { youtubeSettingsSchema, youtubeSchedulingProblem } from '@social-scheduler/shared';
import { YouTubeError } from '../../integrations/youtube/http.js';
import { bundleSchema } from '../../integrations/youtube/schemas.js';
import { eligibleChannelWhere } from '../../lib/channel-eligibility.js';
import type { PublishingServices } from './processor.js';
import type { ClaimedPublication } from './claim.js';
import { readYouTubeVideo } from './youtube-media.js';
import { finishPublication, deferPublication } from './outcomes.js';

type Services = PublishingServices & { youtube: NonNullable<PublishingServices['youtube']> };
const metadataSchema = z.object({
  youtube: youtubeSettingsSchema,
  youtubeConsentedAt: z.iso.datetime(),
  uploadSession: z.string().max(8192).optional(),
});

export async function publishYouTube(services: Services, record: ClaimedPublication) {
  const { db, youtube } = services;
  const { media, metadata } = youtubePost(record);
  const token = await youtube.tokens.validToken(record.socialAccountId);
  if (record.externalContainerId)
    return pollYouTube(
      services,
      record,
      token,
      record.externalContainerId,
      metadata.data.youtube.privacy!,
    );
  if (record.publishRequestedAt && !metadata.data.uploadSession) {
    await finishPublication(db, record, 'UNCERTAIN', 'CHECK_YOUTUBE_OUTCOME');
    return;
  }
  // Verify recovery before loading/retransmitting any bytes. A known session can
  // be resumed only from the server-confirmed offset; an expired one is never replaced.
  let session = metadata.data.uploadSession
    ? youtube.uploadVault.open(Buffer.from(metadata.data.uploadSession, 'base64'), record.id)
    : undefined;
  let progress = session
    ? await youtube.uploads.status(token, session, Number(media.sizeBytes))
    : { offset: 0 };
  if ('id' in progress)
    return savedUpload(services, record, token, progress.id, metadata.data.youtube.privacy!);
  const bytes = await readYouTubeVideo(services.storage, media);
  await markYouTubeSend(services, record, token);
  if (!session) {
    session = await startYouTubeUpload(
      services,
      record,
      token,
      bytes.length,
      metadata.data.youtube,
    );
    const saved = await db.publication.updateMany({
      where: { id: record.id, leaseToken: record.leaseToken, leaseExpiresAt: { gt: new Date() } },
      data: {
        providerMetadata: {
          ...metadata.data,
          uploadSession: Buffer.from(youtube.uploadVault.seal(session, record.id)).toString(
            'base64',
          ),
        },
      },
    });
    if (!saved.count) return;
  }
  progress = await youtube.uploads.send(token, session, bytes, progress.offset);
  if ('id' in progress)
    await savedUpload(services, record, token, progress.id, metadata.data.youtube.privacy!);
  else await deferPublication(db, record);
}

async function startYouTubeUpload(
  { db, youtube }: Services,
  record: ClaimedPublication,
  token: string,
  size: number,
  settings: z.infer<typeof youtubeSettingsSchema>,
) {
  try {
    return await youtube.uploads.start(
      token,
      size,
      record.captionOverride ?? record.post.caption,
      settings,
    );
  } catch (error) {
    // Only a definite rejection of a new initialization permits another init.
    // Existing sessions and every ambiguous response retain their send marker.
    if (
      error instanceof YouTubeError &&
      !error.uncertain &&
      ['RATE_LIMITED', 'TOKEN_REVOKED', 'PERMISSION_REQUIRED', 'PROVIDER_REJECTED'].includes(
        error.code,
      )
    )
      await db.publication.updateMany({
        where: {
          id: record.id,
          leaseToken: record.leaseToken,
          leaseExpiresAt: { gt: new Date() },
          externalContainerId: null,
        },
        data: { publishRequestedAt: null },
      });
    throw error;
  }
}

async function savedUpload(
  services: Services,
  record: ClaimedPublication,
  token: string,
  id: string,
  privacy: string,
) {
  const saved = await services.db.publication.updateMany({
    where: { id: record.id, leaseToken: record.leaseToken, leaseExpiresAt: { gt: new Date() } },
    data: { externalContainerId: id },
  });
  if (saved.count) await pollYouTube(services, record, token, id, privacy);
}
async function pollYouTube(
  { db, youtube }: Services,
  record: ClaimedPublication,
  token: string,
  id: string,
  privacy: string,
) {
  const video = await youtube.client.video(token, id);
  if (video.id !== id || video.snippet.channelId !== record.socialAccount.providerAccountId)
    throw new YouTubeError('ACCOUNT_MISMATCH');
  if (['failed', 'rejected', 'deleted'].includes(video.status.uploadStatus))
    await finishPublication(db, record, 'FAILED', 'YOUTUBE_PROCESSING_FAILED');
  else if (video.status.uploadStatus === 'processed') {
    if (video.status.privacyStatus !== privacy)
      await finishPublication(db, record, 'FAILED', 'YOUTUBE_VISIBILITY_CHANGED');
    else await finishPublication(db, record, 'PUBLISHED', undefined, id);
  } else if (Date.now() - (record.publishRequestedAt?.getTime() ?? Date.now()) > 86400000)
    await finishPublication(db, record, 'UNCERTAIN', 'CHECK_YOUTUBE_PROCESSING');
  else await deferPublication(db, record);
}

function youtubePost(record: ClaimedPublication) {
  const media = record.post.media[0]?.mediaAsset;
  if (
    record.socialAccount.userId !== record.post.userId ||
    record.post.media.length !== 1 ||
    !media ||
    media.userId !== record.post.userId ||
    media.status !== 'READY' ||
    media.type !== 'VIDEO' ||
    media.mimeType !== 'video/mp4'
  )
    throw new YouTubeError('INVALID_PUBLICATION_OWNERSHIP');
  const metadata = metadataSchema.safeParse(record.providerMetadata);
  if (!metadata.success) throw new YouTubeError('CONSENT_REQUIRED');
  if (
    youtubeSchedulingProblem(metadata.data.youtube, record.captionOverride ?? record.post.caption)
  )
    throw new YouTubeError('INVALID_POST_SETTINGS');
  return { media, metadata };
}

async function markYouTubeSend(
  { db, youtube }: Services,
  record: ClaimedPublication,
  token: string,
) {
  const account = await db.socialAccount.findUniqueOrThrow({
    where: { id: record.socialAccountId },
  });
  if (
    !account.tokenCiphertext ||
    bundleSchema.parse(
      JSON.parse(
        youtube.vault.open(
          account.tokenCiphertext,
          account.providerAccountId,
          account.tokenKeyVersion,
        ),
      ),
    ).accessToken !== token
  )
    throw new YouTubeError('CONNECTION_CHANGED');
  const marked = await db.publication.updateMany({
    where: {
      id: record.id,
      leaseToken: record.leaseToken,
      leaseExpiresAt: { gt: new Date() },
      status: { in: ['PROCESSING', 'UNCERTAIN'] },
      socialAccount: {
        userId: record.post.userId,
        ...eligibleChannelWhere(['YOUTUBE']),
        tokenCiphertext: { equals: account.tokenCiphertext },
      },
    },
    data: {
      publishRequestedAt: record.publishRequestedAt ?? new Date(),
      leaseExpiresAt: new Date(Date.now() + 180000),
    },
  });
  if (!marked.count) throw new YouTubeError('CONNECTION_CHANGED');
}
