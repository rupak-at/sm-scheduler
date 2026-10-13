import type { RequestHandler } from 'express';
import { z } from 'zod';
import { updateChannel } from '../services/channels.service.js';
import type { WorkspaceServices } from '../types/workspace.types.js';

export function createChannelsController(services: WorkspaceServices): RequestHandler {
  return async (request, response) => {
    const id = z.uuid().parse(request.params.id);
    const action = z.enum(['validate', 'disconnect']).parse(request.params.action);
    await updateChannel(services, response.locals.userId, id, action);
    response.json({ success: true });
  };
}
