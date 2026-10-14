import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { WorkspaceServices } from '../types/workspace.types.js';
import { readTikTokMedia } from '../services/tiktok-media.service.js';
import { sendMedia } from '../lib/media/media-response.js';

export function createTikTokMediaController(services: WorkspaceServices): RequestHandler {
  return async (request, response) => {
    const media = await readTikTokMedia(
      services,
      z.uuid().parse(request.params.publicationId),
      z.uuid().parse(request.params.mediaId),
      Number(request.query.expires),
      typeof request.query.signature === 'string' ? request.query.signature : '',
    );
    sendMedia(request, response, media.bytes, media.mimeType, 'private, no-store');
  };
}
