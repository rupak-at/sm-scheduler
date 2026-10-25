import { Router } from 'express';
import { createPostsController } from '../controllers/posts.controller.js';
import { PostsService } from '../services/posts.service.js';
import type { WorkspaceServices } from '../types/workspace.types.js';

export function postsRouter(services: WorkspaceServices) {
  const router = Router();
  const posts = new PostsService(
    services.database,
    services.storage,
    services.instagramConfigured,
    services.facebookConfigured ?? false,
    services.tiktok,
    services.youtube,
  );
  const controller = createPostsController(posts);
  router.post('/posts', controller.create);
  router.put('/posts/:id', controller.update);
  router.post('/posts/:id/cancel', controller.cancel);
  router.post('/posts/:id/retry', controller.retry);
  router.delete('/posts/:id', controller.remove);
  return router;
}
