import { Router } from 'express';
import { createHealthController } from '../controllers/health.controller.js';
import type { HealthChecks } from '../services/health.service.js';

export function createHealthRouter(checks: HealthChecks) {
  const router = Router();
  const controller = createHealthController(checks);
  router.get('/live', controller.live);
  router.get('/ready', controller.ready);
  return router;
}
