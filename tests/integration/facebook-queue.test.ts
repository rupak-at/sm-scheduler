import { Queue, Worker } from 'bullmq';
import { expect, it } from 'vitest';
import { PUBLISH_QUEUE, publicationJobSchema } from '@social-scheduler/shared';
import { redisConnectionOptions } from '../../backend/src/config/redis.js';
import { saveFacebookPages } from '../../backend/src/integrations/facebook/accounts.js';
import { PostsService } from '../../backend/src/services/posts.service.js';
import { createPublicationProcessor } from '../../backend/src/worker/publishing/processor.js';
import { reconcilePublications } from '../../backend/src/worker/publishing/reconcile.js';
import { createFacebookWorkspaceFixture } from './fixtures/facebook.js';
import { testOrigin } from './fixtures/instagram.js';

it('delivers a missed Facebook schedule through the shared queue with ID-only, deduplicated jobs', async () => {
  if (!process.env.TEST_REDIS_URL) throw new Error('Use isolated Redis');
  const fixture = await createFacebookWorkspaceFixture();
  const connection = {
    ...redisConnectionOptions(process.env.TEST_REDIS_URL),
    maxRetriesPerRequest: null,
  };
  const queue = new Queue(PUBLISH_QUEUE, { connection });
  const processor = createPublicationProcessor({
    db: fixture.db,
    storage: fixture.storage,
    facebook: fixture.facebook,
  });
  const worker = new Worker(
    PUBLISH_QUEUE,
    async (job) => {
      await processor(publicationJobSchema.parse(job.data).publicationId);
    },
    { connection, autorun: false },
  );
  try {
    await saveFacebookPages(
      fixture.db,
      fixture.facebook.vault,
      await fixture.facebook.client.exchange('code'),
      fixture.userId,
    );
    const page = await fixture.db.socialAccount.findFirstOrThrow({
      where: { userId: fixture.userId, provider: 'FACEBOOK' },
    });
    const upload = await fixture.agent
      .post('/api/workspace/media')
      .set('Origin', testOrigin)
      .set('Content-Type', 'image/jpeg')
      .send(fixture.photo);
    const post = await new PostsService(fixture.db, fixture.storage, false, true).save(
      fixture.userId,
      {
        caption: 'Facebook queue',
        mediaAssetId: upload.body.id,
        socialAccountId: page.id,
        scheduledAt: new Date(Date.now() + 120000).toISOString(),
        timezone: 'UTC',
      },
    );
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
    expect(fixture.facebook.state.photoCalls).toBe(1);
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
    const timer = setTimeout(() => reject(new Error('Facebook queue timed out')), 10000);
    worker.once('completed', () => {
      clearTimeout(timer);
      resolve();
    });
    worker.once('failed', () => {
      clearTimeout(timer);
      reject(new Error('Facebook queue failed'));
    });
  });
}
