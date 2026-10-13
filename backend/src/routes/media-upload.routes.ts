import express, { Router } from 'express';
import { MEDIA_UPLOAD_TYPES, VIDEO_UPLOAD_BYTES } from '@social-scheduler/shared';
import { createMediaTicketController } from '../controllers/media-ticket.controller.js';
import type { WorkspaceServices } from '../types/workspace.types.js';

export function directMediaUploadRouter(services: WorkspaceServices) {
  const router = Router();
  const controller = createMediaTicketController(services);
  router.post(
    '/:id',
    controller.authorize,
    express.raw({ type: [...MEDIA_UPLOAD_TYPES], limit: VIDEO_UPLOAD_BYTES }),
    controller.upload,
  );
  return router;
}
