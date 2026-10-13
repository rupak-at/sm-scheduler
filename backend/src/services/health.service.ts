import type { Readiness } from '@social-scheduler/shared';

export interface HealthChecks {
  database: () => Promise<unknown>;
  redis: () => Promise<unknown>;
}

export async function getReadiness(checks: HealthChecks): Promise<Readiness> {
  const [database, redis] = await Promise.allSettled([checks.database(), checks.redis()]);
  const healthy = database.status === 'fulfilled' && redis.status === 'fulfilled';

  return {
    status: healthy ? 'ok' : 'unavailable',
    service: 'api',
    dependencies: {
      database: database.status === 'fulfilled' ? 'up' : 'down',
      redis: redis.status === 'fulfilled' ? 'up' : 'down',
    },
  };
}
