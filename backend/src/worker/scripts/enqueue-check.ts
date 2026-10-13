import { createLogger } from '../../config/logger.js';
import { redisConnectionOptions } from '../../config/redis.js';
import { SYSTEM_CHECK_QUEUE } from '@social-scheduler/shared';
import { Queue } from 'bullmq';
import { getWorkerEnvironment } from '../../config/environment.js';

const environment = getWorkerEnvironment();
const logger = createLogger('queue-check', environment.LOG_LEVEL);
const queue = new Queue(SYSTEM_CHECK_QUEUE, {
  connection: {
    ...redisConnectionOptions(environment.REDIS_URL),
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  },
});

queue.on('error', () => logger.error('Queue unavailable; check Redis'));
try {
  await queue.waitUntilReady();
  const job = await queue.add(
    'check',
    { requestedAt: new Date().toISOString() },
    {
      removeOnComplete: 20,
      removeOnFail: 20,
    },
  );
  logger.info({ jobId: job.id }, 'Check queued; watch worker logs for completion');
} finally {
  await queue.close();
}
