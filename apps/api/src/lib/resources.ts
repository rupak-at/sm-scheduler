import {
  InstagramClient,
  TokenVault,
  AccountTokens,
  MediaStorage,
} from '@social-scheduler/publishing';
import { instagramCredentials, projectPath } from '@social-scheduler/config';
import type { WorkspaceServices } from '../modules/workspace/workspace.types.js';
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
  workspace: WorkspaceServices;
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
  const credentials = instagramCredentials(environment);
  const configured = credentials !== null;
  const client = credentials ? new InstagramClient(credentials) : undefined;
  const vault = credentials ? new TokenVault(credentials.encryptionKey) : undefined;
  return {
    logger,
    workspace: {
      database,
      instagramConfigured: configured,
      storage: new MediaStorage(
        projectPath(environment.MEDIA_STORAGE_PATH),
        environment.TOKEN_ENCRYPTION_KEY ?? environment.BETTER_AUTH_SECRET,
        environment.MEDIA_PUBLIC_URL,
      ),
      ...(client && vault ? { tokens: new AccountTokens(database, client, vault) } : {}),
    },
    auth: createAuthentication({
      database,
      secret: environment.BETTER_AUTH_SECRET,
      webOrigin: environment.WEB_ORIGIN,
      production: environment.NODE_ENV === 'production',
      ...(client && vault
        ? {
            instagram: {
              database,
              client,
              vault,
              webOrigin: environment.WEB_ORIGIN,
              production: environment.NODE_ENV === 'production',
            },
          }
        : {}),
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
