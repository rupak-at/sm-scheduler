import { createLogger, redisConnectionOptions } from '@social-scheduler/config';
import { createDatabase } from '@social-scheduler/database';
import { Redis } from 'ioredis';
import type { getEnvironment } from '../config/environment.js';
import type { HealthChecks } from '../modules/health/health.service.js';
import { createAuthentication } from '../modules/auth/auth.service.js';
import type { AuthGateway } from '../modules/auth/auth.types.js';

interface Resources {
  logger: ReturnType<typeof createLogger>;
  auth: AuthGateway;
  checks: HealthChecks;
  close: () => Promise<void>;
}

export function createResources(environment: ReturnType<typeof getEnvironment>): Resources {
  const logger = createLogger('api', environment.LOG_LEVEL);
  const database = createDatabase(environment.DATABASE_URL);
  const redis = new Redis({
    ...redisConnectionOptions(environment.REDIS_URL),
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 3000,
    commandTimeout: 3000,
  });
  redis.on('error', () => logger.warn('Redis connection unavailable'));
  return {
    logger,
    auth: createAuthentication({
      database,
      secret: environment.BETTER_AUTH_SECRET,
      webOrigin: environment.WEB_ORIGIN,
      production: environment.NODE_ENV === 'production',
    }),
    checks: {
      database: () => database.$queryRaw`SELECT 1`,
      redis: () => redis.ping(),
    },
    close: async () => {
      redis.disconnect();
      await database.$disconnect();
    },
  };
}
