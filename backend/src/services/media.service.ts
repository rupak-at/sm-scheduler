import type { StoredMediaType } from '@social-scheduler/shared';
import type { WorkspaceServices } from '../types/workspace.types.js';
import { WorkspaceError } from '../lib/workspace-error.js';
import { mediaExtension } from '../lib/media/media-types.js';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../database/index.js';
import type { MediaStorage } from '../lib/media/media-storage.types.js';
import { preparePhoto } from '../lib/media/photo-processing.js';
import { prepareVideo } from '../lib/media/video-processing.js';

export async function uploadMedia(
  database: PrismaClient,
  storage: MediaStorage,
  userId: string,
  bytes: Buffer,
  mimeType: string,
  reservedId?: string,
) {
  const media =
    mimeType === 'video/mp4' ? await prepareVideo(bytes) : await preparePhoto(bytes, mimeType);
  const id = reservedId ?? randomUUID();
  const storageKey = await storage.put(id, media.bytes, media.extension);
  try {
    const data = {
      userId,
      storageKey,
      mimeType: media.mimeType,
      type: media.type,
      status: 'READY' as const,
      sizeBytes: BigInt(media.bytes.length),
      width: media.width,
      height: media.height,
      durationSeconds: media.durationSeconds ?? null,
    };
    if (reservedId) await database.mediaAsset.update({ where: { id }, data });
    else await database.mediaAsset.create({ data: { id, ...data } });
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

type MediaRead =
  { url: string; mimeType: StoredMediaType } | { bytes: Buffer; mimeType: StoredMediaType };

// Private previews and provider downloads use different authorization rules.
export async function readPrivateMedia(
  { database, storage }: WorkspaceServices,
  userId: string,
  id: string,
): Promise<MediaRead> {
  const media = await database.mediaAsset.findFirst({ where: { id, userId, status: 'READY' } });
  if (!media) throw new WorkspaceError(404, 'Media not found.');
  if (!['image/jpeg', 'video/mp4'].includes(media.mimeType))
    throw new WorkspaceError(404, 'Media not found.');
  const mimeType = media.mimeType === 'video/mp4' ? 'video/mp4' : 'image/jpeg';
  const url = storage.previewUrl?.(id, mediaExtension(media.mimeType), media.storageKey);
  if (url) return { url, mimeType };
  return {
    bytes: await storage.read(id, mediaExtension(media.mimeType)),
    mimeType,
  };
}

export async function readPublicMedia(
  { database, storage }: WorkspaceServices,
  id: string,
  expires: number,
  signature: string,
): Promise<MediaRead> {
  if (!storage.authorized(id, expires, signature))
    throw new WorkspaceError(403, 'Media link expired.');
  const media = await database.mediaAsset.findFirst({ where: { id, status: 'READY' } });
  if (!media) throw new WorkspaceError(404, 'Media not found.');
  if (!['image/jpeg', 'video/mp4'].includes(media.mimeType))
    throw new WorkspaceError(404, 'Media not found.');
  const mimeType = media.mimeType === 'video/mp4' ? 'video/mp4' : 'image/jpeg';
  const url = storage.previewUrl?.(id, mediaExtension(media.mimeType), media.storageKey);
  if (url) return { url, mimeType };
  return {
    bytes: await storage.read(id, mediaExtension(media.mimeType)),
    mimeType,
  };
}
