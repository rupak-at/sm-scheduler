import { createInstagramServices } from '../integrations/instagram/services.js';
import { createFacebookServices } from '../integrations/facebook/services.js';
import { createTikTokServices } from '../integrations/tiktok/services.js';
import { createYouTubeServices } from '../integrations/youtube/services.js';
import { createMediaStorage } from './media-storage.js';
import type { WorkspaceServices } from '../types/workspace.types.js';
import { createLogger } from './logger.js';
import { redisConnectionOptions } from './redis.js';
import { createDatabase } from '../database/index.js';
import { Redis } from 'ioredis';
import type { ApiEnvironment } from './environment.js';
import type { HealthChecks } from '../services/health.service.js';
import { createAuthentication } from '../services/auth.service.js';
import type { AuthGateway } from '../types/auth.types.js';

interface Resources {
  logger: ReturnType<typeof createLogger>;
  auth: AuthGateway;
  workspace: WorkspaceServices;
  checks: HealthChecks;
  close: () => Promise<void>;
}

export function createResources(environment: ApiEnvironment): Resources {
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
  const instagram = createInstagramServices(environment, database);
  const facebook = createFacebookServices(environment, database);
  const tiktok = createTikTokServices(environment, database);
  const youtube = createYouTubeServices(environment, database);
  const authentication = createAuthentication({
    database,
    secret: environment.BETTER_AUTH_SECRET,
    webOrigin: environment.WEB_ORIGIN,
    production: environment.NODE_ENV === 'production',
    ...providerAuthentication(environment, database, instagram, facebook, tiktok, youtube),
  });
  return {
    logger,
    workspace: {
      database,
      instagramConfigured: instagram !== null,
      facebookConfigured: facebook !== null,
      storage: createMediaStorage(
        environment,
        environment.TOKEN_ENCRYPTION_KEY ?? environment.BETTER_AUTH_SECRET,
      ),
      uploads: {
        signingKey: environment.BETTER_AUTH_SECRET,
        apiOrigin: environment.API_PUBLIC_URL,
        webOrigin: environment.WEB_ORIGIN,
      },
      ...(instagram ? { tokens: instagram.tokens } : {}),
      ...(facebook ? { facebookTokens: facebook.tokens } : {}),
      ...(tiktok ? { tiktok } : {}),
      ...(youtube ? { youtube } : {}),
    },
    auth: authentication,
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

function providerAuthentication(
  environment: ApiEnvironment,
  database: WorkspaceServices['database'],
  instagram: ReturnType<typeof createInstagramServices>,
  facebook: ReturnType<typeof createFacebookServices>,
  tiktok: ReturnType<typeof createTikTokServices>,
  youtube: ReturnType<typeof createYouTubeServices>,
) {
  const common = {
    database,
    webOrigin: environment.WEB_ORIGIN,
    production: environment.NODE_ENV === 'production',
  };
  return {
    ...(instagram
      ? { instagram: { ...common, client: instagram.client, vault: instagram.vault } }
      : {}),
    ...(facebook
      ? { facebook: { ...common, client: facebook.client, vault: facebook.vault } }
      : {}),
    ...(tiktok ? { tiktok: { ...common, client: tiktok.client, vault: tiktok.vault } } : {}),
    ...(youtube ? { youtube: { ...common, client: youtube.client, vault: youtube.vault } } : {}),
  };
}
