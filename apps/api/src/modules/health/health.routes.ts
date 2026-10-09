import { Router } from 'express';
import { getReadiness, type HealthChecks } from './health.service.js';

export function createHealthRouter(checks: HealthChecks) {
  const router = Router();
  router.get('/live', (_request, response) => {
    response.set('Cache-Control', 'no-store').json({ status: 'ok', service: 'api' });
  });
  router.get('/ready', async (_request, response) => {
    const health = await getReadiness(checks);
    response
      .set('Cache-Control', 'no-store')
      .status(health.status === 'ok' ? 200 : 503)
      .json(health);
  });
  return router;
}
