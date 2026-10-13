import type { RequestHandler } from 'express';
import { z } from 'zod';
import { mediaUploadRequestSchema } from '@social-scheduler/shared';
import type { WorkspaceServices } from '../types/workspace.types.js';
import {
  createMediaTicket,
  claimMediaTicket,
  completeMediaTicket,
} from '../services/media-ticket.service.js';
import { WorkspaceError } from '../lib/workspace-error.js';

export function createMediaTicketController(services: WorkspaceServices) {
  return {
    create: async (request, response) => {
      const ticket = await createMediaTicket(
        services,
        response.locals.userId,
        mediaUploadRequestSchema.parse(request.body),
      );
      response.set('Cache-Control', 'no-store').status(201).json(ticket);
    },
    authorize: async (request, response, next) => {
      if (request.get('origin') !== services.uploads.webOrigin)
        throw new WorkspaceError(403, 'Request origin is not allowed.');
      const id = z.uuid().parse(request.params.id);
      const token = request.get('authorization')?.replace(/^Bearer /, '') ?? '';
      const mimeType = request.get('content-type')?.split(';')[0] ?? '';
      await claimMediaTicket(services, id, token, mimeType);
      response.locals.uploadId = id;
      next();
    },
    upload: async (request, response) => {
      if (!Buffer.isBuffer(request.body))
        throw new WorkspaceError(422, 'Choose a supported photo or video.');
      response
        .status(201)
        .json(await completeMediaTicket(services, response.locals.uploadId, request.body));
    },
  } satisfies Record<string, RequestHandler>;
}
