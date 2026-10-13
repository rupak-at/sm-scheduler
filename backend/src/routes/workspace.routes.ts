import { Router } from 'express';
import type { AuthGateway } from '../types/auth.types.js';
import type { WorkspaceServices } from '../types/workspace.types.js';
import { workspaceAuthorization } from '../middleware/workspace-authorization.js';
import { createWorkspaceController } from '../controllers/workspace.controller.js';
import { mediaRouter } from './media.routes.js';
import { postsRouter } from './posts.routes.js';
import { channelsRouter } from './channels.routes.js';

export function workspaceRouter(services: WorkspaceServices, auth: AuthGateway, origin: string) {
  const router = Router();
  router.use(workspaceAuthorization(auth, services.database, origin));
  router.get('/', createWorkspaceController(services));
  router.use(mediaRouter(services));
  router.use(postsRouter(services));
  router.use(channelsRouter(services));
  return router;
}
