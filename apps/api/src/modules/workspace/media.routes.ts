import express, { Router } from 'express';
import { z } from 'zod';
import { MEDIA_UPLOAD_TYPES, VIDEO_UPLOAD_BYTES } from '@social-scheduler/shared';
import { WorkspaceError } from './errors.js';
import type { WorkspaceServices } from './workspace.types.js';
import { uploadMedia } from './media-upload.js';
import { mediaExtension } from './media-types.js';
import { sendMedia } from './media-response.js';

export function publicMediaRouter({ database, storage }: WorkspaceServices) {
  const router = Router();
  router.get('/:id', async (request, response) => {
    const id = z.uuid().parse(request.params.id);
    const expires = Number(request.query.expires);
    const signature = typeof request.query.signature === 'string' ? request.query.signature : '';
    if (!storage.authorized(id, expires, signature))
      throw new WorkspaceError(403, 'Media link expired.');
    const media = await database.mediaAsset.findFirst({ where: { id, status: 'READY' } });
    if (!media) throw new WorkspaceError(404, 'Media not found.');
    sendMedia(
      request,
      response,
      await storage.read(id, mediaExtension(media.mimeType)),
      media.mimeType,
    );
  });
  return router;
}
export function mediaRouter({ database, storage }: WorkspaceServices) {
  const router = Router();
  router.post(
    '/media',
    express.raw({ type: [...MEDIA_UPLOAD_TYPES], limit: VIDEO_UPLOAD_BYTES }),
    async (request, response) => {
      if (!Buffer.isBuffer(request.body) || !request.body.length)
        throw new WorkspaceError(422, 'Choose a JPEG, PNG, WebP, AVIF photo, or an MP4 video.');
      response
        .status(201)
        .json(
          await uploadMedia(
            database,
            storage,
            response.locals.userId,
            request.body,
            request.get('content-type')!.split(';')[0]!,
          ),
        );
    },
  );
  router.get('/media/:id', async (request, response) => {
    const id = z.uuid().parse(request.params.id);
    const media = await database.mediaAsset.findFirst({
      where: { id, userId: response.locals.userId, status: 'READY' },
    });
    if (!media) throw new WorkspaceError(404, 'Media not found.');
    sendMedia(
      request,
      response,
      await storage.read(id, mediaExtension(media.mimeType)),
      media.mimeType,
    );
  });
  return router;
}
