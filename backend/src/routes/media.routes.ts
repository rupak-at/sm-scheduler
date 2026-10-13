import express, { Router } from 'express';
import { MEDIA_UPLOAD_TYPES, VIDEO_UPLOAD_BYTES } from '@social-scheduler/shared';
import { createMediaController } from '../controllers/media.controller.js';
import type { WorkspaceServices } from '../types/workspace.types.js';

export function publicMediaRouter(services: WorkspaceServices) {
  const router = Router();
  router.get('/:id', createMediaController(services).publicDownload);
  return router;
}

export function mediaRouter(services: WorkspaceServices) {
  const router = Router();
  const controller = createMediaController(services);
  router.post(
    '/media',
    express.raw({ type: [...MEDIA_UPLOAD_TYPES], limit: VIDEO_UPLOAD_BYTES }),
    controller.upload,
  );
  router.get('/media/:id', controller.privatePreview);
  return router;
}
