import type { RequestHandler } from 'express';
import { z } from 'zod';
import { WorkspaceError } from '../lib/workspace-error.js';
import { sendMedia } from '../lib/media/media-response.js';
import { uploadMedia, readPrivateMedia, readPublicMedia } from '../services/media.service.js';
import type { WorkspaceServices } from '../types/workspace.types.js';

export function createMediaController(services: WorkspaceServices) {
  return {
    upload: async (request, response) => {
      if (!Buffer.isBuffer(request.body) || !request.body.length)
        throw new WorkspaceError(422, 'Choose a JPEG, PNG, WebP, AVIF photo, or an MP4 video.');
      const media = await uploadMedia(
        services.database,
        services.storage,
        response.locals.userId,
        request.body,
        request.get('content-type')!.split(';')[0]!,
      );
      response.status(201).json(media);
    },
    privatePreview: async (request, response) => {
      const id = z.uuid().parse(request.params.id);
      const media = await readPrivateMedia(services, response.locals.userId, id);
      if ('url' in media) response.set('Cache-Control', 'no-store').redirect(307, media.url);
      else sendMedia(request, response, media.bytes, media.mimeType);
    },
    publicDownload: async (request, response) => {
      const id = z.uuid().parse(request.params.id);
      const expires = Number(request.query.expires);
      const signature = typeof request.query.signature === 'string' ? request.query.signature : '';
      const media = await readPublicMedia(services, id, expires, signature);
      if ('url' in media) response.set('Cache-Control', 'no-store').redirect(307, media.url);
      else sendMedia(request, response, media.bytes, media.mimeType);
    },
  } satisfies Record<string, RequestHandler>;
}
