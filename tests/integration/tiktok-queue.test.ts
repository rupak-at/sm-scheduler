import { Queue, Worker } from 'bullmq';
import { expect, it } from 'vitest';
import {
  PUBLISH_QUEUE,
  publicationJobSchema,
  tiktokSettingsSchema,
} from '@social-scheduler/shared';
import { redisConnectionOptions } from '../../backend/src/config/redis.js';
import { saveTikTokAccount } from '../../backend/src/integrations/tiktok/accounts.js';
import { PostsService } from '../../backend/src/services/posts.service.js';
import { createPublicationProcessor } from '../../backend/src/worker/publishing/processor.js';
import { reconcilePublications } from '../../backend/src/worker/publishing/reconcile.js';
import { createTikTokWorkspaceFixture } from './fixtures/tiktok.js';
import { testOrigin } from './fixtures/instagram.js';

it('delivers a missed TikTok schedule through the shared queue with ID-only, deduplicated jobs', async () => {
  if (!process.env.TEST_REDIS_URL) throw new Error('Use isolated Redis');
  const fixture = await createTikTokWorkspaceFixture();
  const connection = {
    ...redisConnectionOptions(process.env.TEST_REDIS_URL),
    maxRetriesPerRequest: null,
  };
  const queue = new Queue(PUBLISH_QUEUE, { connection });
  fixture.tiktok.state.status = 'PUBLISH_COMPLETE';
  const processor = createPublicationProcessor({
    db: fixture.db,
    storage: fixture.storage,
    tiktok: fixture.tiktok,
  });
  const worker = new Worker(
    PUBLISH_QUEUE,
    async (job) => {
      await processor(publicationJobSchema.parse(job.data).publicationId);
    },
    { connection, autorun: false },
  );
  try {
    await saveTikTokAccount(
      fixture.db,
      fixture.tiktok.vault,
      await fixture.tiktok.client.exchange('code'),
      fixture.userId,
    );
    const page = await fixture.db.socialAccount.findFirstOrThrow({
      where: { userId: fixture.userId, provider: 'TIKTOK' },
    });
    const upload = await fixture.agent
      .post('/api/workspace/media')
      .set('Origin', testOrigin)
      .set('Content-Type', 'image/jpeg')
      .send(fixture.photo);
    const post = await new PostsService(
      fixture.db,
      fixture.storage,
      false,
      false,
      fixture.tiktok,
    ).save(fixture.userId, {
      caption: 'TikTok queue',
      mediaAssetId: upload.body.id,
      socialAccountId: page.id,
      scheduledAt: new Date(Date.now() + 120000).toISOString(),
      timezone: 'UTC',
      tiktokSettings: tiktokSettingsSchema.parse({ privacy: 'SELF_ONLY', consent: true }),
    });
    await fixture.db.publication.update({
      where: { id: post.publicationId },
      data: { scheduledAt: new Date(0) },
    });
    await reconcilePublications(fixture.db, queue);
    await reconcilePublications(fixture.db, queue);
    expect(await queue.getWaitingCount()).toBe(1);
    expect((await queue.getJob(post.publicationId))?.data).toEqual({
      publicationId: post.publicationId,
    });
    const completed = waitForPublication(worker);
    const running = worker.run();
    await completed;
    const publication = await fixture.db.publication.findUniqueOrThrow({
      where: { id: post.publicationId },
    });
    expect(publication.status).toBe('PUBLISHED');
    expect(fixture.tiktok.state.publishCalls).toBe(1);
    await worker.close();
    await running;
  } finally {
    await worker.close();
    await queue.close();
    await fixture.close();
  }
});

function waitForPublication(worker: Worker): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TikTok queue timed out')), 10000);
    worker.once('completed', () => {
      clearTimeout(timer);
      resolve();
    });
    worker.once('failed', () => {
      clearTimeout(timer);
      reject(new Error('TikTok queue failed'));
    });
  });
}
