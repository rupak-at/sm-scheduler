import { createLogger, redisConnectionOptions } from '@social-scheduler/config';
import { SYSTEM_CHECK_QUEUE } from '@social-scheduler/shared';
import { Queue } from 'bullmq';
import { getEnvironment } from '../config/environment.js';

const environment = getEnvironment();
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
