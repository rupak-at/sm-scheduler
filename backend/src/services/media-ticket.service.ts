import { randomUUID } from 'node:crypto';
import type { MediaUploadRequest } from '@social-scheduler/shared';
import type { WorkspaceServices } from '../types/workspace.types.js';
import { WorkspaceError } from '../lib/workspace-error.js';
import { createUploadToken, validUploadToken } from '../lib/media/upload-token.js';
import { uploadMedia } from './media.service.js';

export async function createMediaTicket(
  services: WorkspaceServices,
  userId: string,
  input: MediaUploadRequest,
) {
  const id = randomUUID();
  services.storage.publicMediaUrl(id, input.mimeType === 'video/mp4' ? 'mp4' : 'jpg');
  await services.database.mediaAsset.updateMany({
    where: {
      userId,
      OR: [
        { status: 'UPLOADED', createdAt: { lt: new Date(Date.now() - 600000) } },
        { status: 'PROCESSING', createdAt: { lt: new Date(Date.now() - 1200000) } },
      ],
    },
    data: { status: 'FAILED' },
  });
  await services.database.mediaAsset.create({
    data: {
      id,
      userId,
      storageKey: `pending:${id}`,
      mimeType: input.mimeType,
      type: input.mimeType === 'video/mp4' ? 'VIDEO' : 'IMAGE',
      status: 'UPLOADED',
      sizeBytes: BigInt(input.sizeBytes),
    },
  });
  return {
    id,
    url: new URL(`/api/media/upload/${id}`, services.uploads.apiOrigin).toString(),
    token: createUploadToken(services.uploads.signingKey, id),
  };
}

export async function claimMediaTicket(
  services: WorkspaceServices,
  id: string,
  token: string,
  mimeType: string,
) {
  if (!validUploadToken(services.uploads.signingKey, id, token))
    throw new WorkspaceError(403, 'Upload authorization expired. Choose the file again.');
  const media = await services.database.mediaAsset.findFirst({
    where: { id, status: 'UPLOADED', createdAt: { gt: new Date(Date.now() - 600000) }, mimeType },
  });
  if (!media)
    throw new WorkspaceError(409, 'Upload authorization has already been used or changed.');
  // Claim before accepting bytes. A ticket authorizes exactly one upload for its persisted owner/type/size.
  const claimed = await services.database.mediaAsset.updateMany({
    where: { id, status: 'UPLOADED', userId: media.userId },
    data: { status: 'PROCESSING' },
  });
  if (!claimed.count) throw new WorkspaceError(409, 'Upload authorization has already been used.');
  return media;
}

export async function completeMediaTicket(services: WorkspaceServices, id: string, bytes: Buffer) {
  const media = await services.database.mediaAsset.findUniqueOrThrow({ where: { id } });
  try {
    if (media.status !== 'PROCESSING' || BigInt(bytes.length) !== media.sizeBytes)
      throw new WorkspaceError(422, 'The uploaded file does not match its authorization.');
    return await uploadMedia(
      services.database,
      services.storage,
      media.userId,
      bytes,
      media.mimeType,
      id,
    );
  } catch (error) {
    await services.database.mediaAsset.updateMany({
      where: { id, status: 'PROCESSING' },
      data: { status: 'FAILED' },
    });
    throw error;
  }
}
