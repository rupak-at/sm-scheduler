import type { RequestHandler } from 'express';
import { readWorkspace } from '../repositories/workspace.repository.js';
import { workspaceQuerySchema } from '../validators/workspace.schemas.js';
import type { WorkspaceServices } from '../types/workspace.types.js';

export function createWorkspaceController(services: WorkspaceServices): RequestHandler {
  return async (request, response) => {
    const workspace = await readWorkspace(
      services.database,
      response.locals.userId,
      workspaceQuerySchema.parse(request.query),
    );
    response.set('Cache-Control', 'no-store').json({
      instagramConfigured: services.instagramConfigured,
      facebookConfigured: services.facebookConfigured ?? false,
      tiktokConfigured: Boolean(services.tiktok),
      youtubeConfigured: Boolean(services.youtube),
      ...workspace,
    });
  };
}
