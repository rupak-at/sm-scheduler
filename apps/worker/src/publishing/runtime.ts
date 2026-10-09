import { reconcilePublications } from './reconcile.js';
import { startPoller } from './poller.js';
import { publicationJobSchema } from '@social-scheduler/shared';
import { Queue, Worker } from 'bullmq';
import { PUBLISH_QUEUE } from '@social-scheduler/shared';
import {
  instagramCredentials,
  projectPath,
  redisConnectionOptions,
} from '@social-scheduler/config';
import {
  InstagramClient,
  TokenVault,
  AccountTokens,
  MediaStorage,
} from '@social-scheduler/publishing';
import type { PrismaClient } from '@social-scheduler/database';
import type { getEnvironment } from '../config/environment.js';
import type { createLogger } from '@social-scheduler/config';
import { createPublicationProcessor } from './processor.js';

export function createPublishingRuntime(
  env: ReturnType<typeof getEnvironment>,
  db: PrismaClient,
  logger: ReturnType<typeof createLogger>,
) {
  const credentials = instagramCredentials(env);
  if (!credentials) {
    logger.info('Instagram publishing disabled; configure Instagram credentials');
    return null;
  }
  const client = new InstagramClient(credentials);
  const tokens = new AccountTokens(db, client, new TokenVault(credentials.encryptionKey));
  const storage = new MediaStorage(
    projectPath(env.MEDIA_STORAGE_PATH),
    credentials.encryptionKey,
    env.MEDIA_PUBLIC_URL,
  );
  const connection = { ...redisConnectionOptions(env.REDIS_URL), maxRetriesPerRequest: null };
  const queue = new Queue(PUBLISH_QUEUE, { connection });
  queue.on('error', () => logger.warn('Publishing queue connection unavailable'));
  const processPublication = createPublicationProcessor({ db, client, tokens, storage });
  const worker = new Worker<{ publicationId: string }>(
    PUBLISH_QUEUE,
    async (job) => {
      await processPublication(publicationJobSchema.parse(job.data).publicationId);
    },
    { connection, concurrency: env.WORKER_CONCURRENCY },
  );
  worker.on('error', () => logger.error('Publishing queue unavailable'));
  worker.on('failed', (job) =>
    logger.warn({ jobId: job?.id }, 'Publishing job failed; reconciliation will retry'),
  );
  const stopScan = startPoller(
    () => reconcilePublications(db, queue),
    10000,
    () => logger.warn('Publishing reconciliation unavailable; will retry'),
  );
  const stopTokens = startPoller(
    () => tokens.maintain(),
    1800000,
    () => logger.warn('Instagram token maintenance unavailable; will retry'),
  );
  return {
    ready: () => worker.waitUntilReady(),
    close: async () => {
      await Promise.all([stopScan(), stopTokens()]);
      await worker.close();
      await queue.close();
    },
  };
}
