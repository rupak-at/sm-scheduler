import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@social-scheduler/database';
import type { MediaStorage } from '@social-scheduler/publishing';
import { preparePhoto } from './photo-processing.js';
import { prepareVideo } from './video-processing.js';

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
