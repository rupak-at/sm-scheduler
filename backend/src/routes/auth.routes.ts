import { Router } from 'express';
import { createSessionController } from '../controllers/auth.controller.js';
import type { AuthGateway } from '../types/auth.types.js';

export function createAuthRouter(auth: AuthGateway) {
  const router = Router();
  router.get('/me', createSessionController(auth));
  return router;
}
