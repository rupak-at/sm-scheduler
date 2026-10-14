import { Router } from 'express';
import { createChannelsController } from '../controllers/channels.controller.js';
import type { WorkspaceServices } from '../types/workspace.types.js';
import { z } from 'zod';
import { readTikTokCreator } from '../services/tiktok-creator.service.js';

export function channelsRouter(services: WorkspaceServices) {
  const router = Router();
  router.get('/channels/:id/tiktok/creator', async (request, response) => {
    response
      .set('Cache-Control', 'no-store')
      .json(
        await readTikTokCreator(
          services,
          response.locals.userId,
          z.uuid().parse(request.params.id),
        ),
      );
  });
  router.post('/channels/:id/:action', createChannelsController(services));
  return router;
}
