import { createLogger, redisConnectionOptions } from '@social-scheduler/config';
import { createDatabase } from '@social-scheduler/database';
import { SYSTEM_CHECK_QUEUE } from '@social-scheduler/shared';
import { Worker } from 'bullmq';
import { getEnvironment } from './config/environment.js';
import { createSystemCheckProcessor } from './processors/system-check.js';

const environment = getEnvironment();
const logger = createLogger('worker', environment.LOG_LEVEL);
const database = createDatabase(environment.DATABASE_URL);

// Only infrastructure-check jobs are consumed until durable publishing is implemented.
const worker = new Worker(
  SYSTEM_CHECK_QUEUE,
  createSystemCheckProcessor(() => database.$queryRaw`SELECT 1`),
  {
    connection: {
      ...redisConnectionOptions(environment.REDIS_URL),
      maxRetriesPerRequest: null,
    },
    concurrency: environment.WORKER_CONCURRENCY,
  },
);
worker.on('completed', (job) => logger.info({ jobId: job.id }, 'Infrastructure check completed'));
worker.on('failed', (job) => logger.warn({ jobId: job?.id }, 'Infrastructure check failed'));
worker.on('error', () => logger.error('Worker connection error; check infrastructure'));

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 10000).unref();
  logger.info('Stopping worker');
  try {
    await worker.close();
    await database.$disconnect();
    clearTimeout(deadline);
  } catch {
    process.exit(1);
  }
}
process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

try {
  await worker.waitUntilReady();
  await database.$queryRaw`SELECT 1`;
  logger.info({ queue: SYSTEM_CHECK_QUEUE }, 'Worker ready');
} catch {
  logger.error('Worker startup check failed');
  process.exitCode = 1;
  await shutdown();
}
