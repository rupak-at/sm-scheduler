import { Router } from 'express';
import { createChannelsController } from '../controllers/channels.controller.js';
import type { WorkspaceServices } from '../types/workspace.types.js';

export function channelsRouter(services: WorkspaceServices) {
  const router = Router();
  router.post('/channels/:id/:action', createChannelsController(services));
  return router;
}
