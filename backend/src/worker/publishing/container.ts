import type { InstagramPublishingServices } from './instagram.js';
import type { ClaimedPublication } from './claim.js';

export async function preparePublicationContainer(
  { db, client, storage }: InstagramPublishingServices,
  record: ClaimedPublication,
  media: ClaimedPublication['post']['media'][number]['mediaAsset'],
  token: string,
): Promise<string | null> {
  if (record.externalContainerId) return record.externalContainerId;
  const create =
    media.type === 'VIDEO'
      ? client.createReelContainer.bind(client)
      : client.createContainer.bind(client);
  const result = await create(
    record.socialAccount.providerAccountId,
    token,
    storage.publicMediaUrl(
      media.id,
      media.mimeType === 'video/mp4' ? 'mp4' : 'jpg',
      media.storageKey,
    ),
    record.captionOverride ?? record.post.caption,
  );
  const saved = await db.publication.updateMany({
    where: { id: record.id, leaseToken: record.leaseToken, leaseExpiresAt: { gt: new Date() } },
    data: { externalContainerId: result.id },
  });
  return saved.count ? result.id : null;
}
