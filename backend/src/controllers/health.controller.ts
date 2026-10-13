import type { RequestHandler } from 'express';
import { getReadiness, type HealthChecks } from '../services/health.service.js';

export function createHealthController(checks: HealthChecks) {
  return {
    live: (_request, response) => {
      response.set('Cache-Control', 'no-store').json({ status: 'ok', service: 'api' });
    },
    ready: async (_request, response) => {
      const health = await getReadiness(checks);
      response
        .set('Cache-Control', 'no-store')
        .status(health.status === 'ok' ? 200 : 503)
        .json(health);
    },
  } satisfies Record<string, RequestHandler>;
}
