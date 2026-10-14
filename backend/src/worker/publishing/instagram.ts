import type { PrismaClient } from '../../database/index.js';
import { InstagramError } from '../../integrations/instagram/http.js';
import type { InstagramClient } from '../../integrations/instagram/client.js';
import type { AccountTokens } from '../../integrations/instagram/account-tokens.js';
import type { MediaStorage } from '../../lib/media/media-storage.types.js';
import type { ClaimedPublication } from './claim.js';
import { finishPublication, deferPublication } from './outcomes.js';
import { preparePublicationContainer } from './container.js';

export interface InstagramPublishingServices {
  db: PrismaClient;
  client: InstagramClient;
  tokens: AccountTokens;
  storage: MediaStorage;
}
export async function publishInstagram(
  services: InstagramPublishingServices,
  record: ClaimedPublication,
) {
  const { db, client, tokens } = services;
  const media = record.post.media[0]?.mediaAsset;
  if (
    record.socialAccount.userId !== record.post.userId ||
    !media ||
    media.userId !== record.post.userId ||
    media.status !== 'READY' ||
    !(
      (media.type === 'IMAGE' && media.mimeType === 'image/jpeg') ||
      (media.type === 'VIDEO' && media.mimeType === 'video/mp4')
    )
  )
    throw new InstagramError('INVALID_PUBLICATION_OWNERSHIP');
  const token = await tokens.validToken(record.socialAccountId);
  const container = await preparePublicationContainer(services, record, media, token);
  if (!container) return;
  const { status_code: status } = await client.containerStatus(container, token);
  if (status === 'PUBLISHED') {
    await finishPublication(db, record, 'PUBLISHED');
    return;
  }
  if (status === 'IN_PROGRESS') {
    await deferPublication(db, record);
    return;
  }
  if (record.publishRequestedAt) {
    await finishPublication(db, record, 'UNCERTAIN', 'CHECK_INSTAGRAM_OUTCOME');
    return;
  }
  if (status !== 'FINISHED') throw new InstagramError(`CONTAINER_${status}`);
  const marked = await db.publication.updateMany({
    where: {
      id: record.id,
      leaseToken: record.leaseToken,
      leaseExpiresAt: { gt: new Date() },
      status: 'PROCESSING',
      publishRequestedAt: null,
      socialAccount: { status: 'CONNECTED', tokenExpiresAt: { gt: new Date() } },
    },
    data: { publishRequestedAt: new Date() },
  });
  if (!marked.count) throw new InstagramError('CONNECTION_CHANGED');
  const result = await client.publishContainer(
    record.socialAccount.providerAccountId,
    token,
    container,
  );
  await finishPublication(db, record, 'PUBLISHED', undefined, result.id);
}
