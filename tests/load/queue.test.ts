import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { Queue, Worker } from 'bullmq';
import { expect, it } from 'vitest';
import { publicationJobSchema } from '@social-scheduler/shared';
import { createLoadFixture } from './fixture.js';
import type { LoadProvider } from './fixture.js';
import { queueProvider, seedPublications, isolatedRedis } from './queue-fixture.js';
import { redisConnectionOptions } from '../../backend/src/config/redis.js';
import { createPublicationProcessor } from '../../backend/src/worker/publishing/processor.js';
import { reconcilePublications } from '../../backend/src/worker/publishing/reconcile.js';
import { AccountTokens } from '../../backend/src/integrations/instagram/account-tokens.js';
import { TokenVault } from '../../backend/src/integrations/instagram/token-crypto.js';

it.each(['INSTAGRAM', 'TIKTOK', 'YOUTUBE'] as const)(
  'drains 1,000 %s publications through Redis without duplicate sends',
  async (provider) => {
    const fixture = await createLoadFixture(1000, undefined, provider);
    const connection = { ...redisConnectionOptions(isolatedRedis()), maxRetriesPerRequest: null };
    const queue = new Queue(`load-publishing-${randomUUID()}`, { connection });
    const { client, sends: instagramSends } = queueProvider();
    const sends = fixture.youtube?.sends ?? fixture.tiktok?.sends ?? instagramSends;
    const tokenVault = new TokenVault(Buffer.alloc(32, 7).toString('base64'));
    const processor = createPublicationProcessor({
      db: fixture.db,
      storage: fixture.storage,
      client,
      ...(fixture.tiktok ? { tiktok: fixture.tiktok } : {}),
      ...(fixture.youtube ? { youtube: fixture.youtube } : {}),
      tokens: new AccountTokens(fixture.db, client, tokenVault),
    });
    const worker = new Worker(
      queue.name,
      async (job) => processor(publicationJobSchema.parse(job.data).publicationId),
      { connection, concurrency: 2, autorun: false },
    );
    const failures: string[] = [];
    worker.on('error', () => failures.push('worker-error'));
    worker.on('failed', () => failures.push('job-failed'));
    let running: Promise<void> | undefined;
    const started = performance.now();
    try {
      await seedPublications(fixture);
      await reconcilePublications(fixture.db, queue);
      await reconcilePublications(fixture.db, queue);
      expect(await queue.getWaitingCount()).toBe(100);
      running = worker.run();
      const deadline = Date.now() + 120000;
      let published = 0;
      while (published < 1000 && Date.now() < deadline) {
        await reconcilePublications(fixture.db, queue);
        published = await fixture.db.publication.count({
          where: { post: { userId: { in: fixture.users.map((u) => u.id) } }, status: 'PUBLISHED' },
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      await worker.close();
      await running;
      const attempts = await fixture.db.publishAttempt.count({
        where: {
          publication: { post: { userId: { in: fixture.users.map((u) => u.id) } } },
          status: 'SUCCEEDED',
        },
      });
      const report = {
        publications: 1000,
        provider,
        workerConcurrency: 2,
        elapsedMs: Math.round(performance.now() - started),
        published,
        attempts,
        remoteSends: [...sends.values()].reduce((a, b) => a + b, 0),
        duplicateSends: [...sends.values()].filter((n) => n !== 1).length,
        failures,
      };
      await writeQueueReport(provider, report);
      expect(report).toMatchObject({
        published: 1000,
        attempts: 1000,
        remoteSends: 1000,
        duplicateSends: 0,
        failures: [],
      });
    } finally {
      await worker.close();
      await running;
      await queue.obliterate({ force: true });
      await queue.close();
      await fixture.close();
    }
  },
);

async function writeQueueReport(provider: LoadProvider, report: object) {
  const paths = {
    INSTAGRAM: process.env.QUEUE_REPORT_PATH ?? '/tmp/scheduler-load-queue.json',
    TIKTOK: process.env.TIKTOK_QUEUE_REPORT_PATH ?? '/tmp/scheduler-tiktok-load-queue.json',
    YOUTUBE: process.env.YOUTUBE_QUEUE_REPORT_PATH ?? '/tmp/scheduler-youtube-load-queue.json',
  };
  await writeFile(paths[provider], JSON.stringify(report, null, 2) + '\n');
}
