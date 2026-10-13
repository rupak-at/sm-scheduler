import type { WorkspaceServices } from '../types/workspace.types.js';
import { WorkspaceError } from '../lib/workspace-error.js';
import { mediaExtension } from '../lib/media/media-types.js';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../database/index.js';
import type { MediaStorage } from '../lib/media/storage.js';
import { preparePhoto } from '../lib/media/photo-processing.js';
import { prepareVideo } from '../lib/media/video-processing.js';

export async function uploadMedia(
  database: PrismaClient,
  storage: MediaStorage,
  userId: string,
  bytes: Buffer,
  mimeType: string,
) {
  const media =
    mimeType === 'video/mp4' ? await prepareVideo(bytes) : await preparePhoto(bytes, mimeType);
  const id = randomUUID();
  await storage.put(id, media.bytes, media.extension);
  try {
    await database.mediaAsset.create({
      data: {
        id,
        userId,
        storageKey: `${id}.${media.extension}`,
        mimeType: media.mimeType,
        type: media.type,
        status: 'READY',
        sizeBytes: BigInt(media.bytes.length),
        width: media.width,
        height: media.height,
      },
    });
  } catch (error) {
    await storage.remove(id, media.extension);
    throw error;
  }
  return {
    id,
    url: `/api/workspace/media/${id}`,
    mimeType: media.mimeType,
    width: media.width,
    height: media.height,
  };
}

// Private previews and provider downloads use different authorization rules.
export async function readPrivateMedia(
  { database, storage }: WorkspaceServices,
  userId: string,
  id: string,
) {
  const media = await database.mediaAsset.findFirst({ where: { id, userId, status: 'READY' } });
  if (!media) throw new WorkspaceError(404, 'Media not found.');
  return {
    bytes: await storage.read(id, mediaExtension(media.mimeType)),
    mimeType: media.mimeType,
  };
}

export async function readPublicMedia(
  { database, storage }: WorkspaceServices,
  id: string,
  expires: number,
  signature: string,
) {
  if (!storage.authorized(id, expires, signature))
    throw new WorkspaceError(403, 'Media link expired.');
  const media = await database.mediaAsset.findFirst({ where: { id, status: 'READY' } });
  if (!media) throw new WorkspaceError(404, 'Media not found.');
  return {
    bytes: await storage.read(id, mediaExtension(media.mimeType)),
    mimeType: media.mimeType,
  };
}
