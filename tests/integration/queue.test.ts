import { Queue, Worker } from 'bullmq';
import { redisConnectionOptions } from '@social-scheduler/config';
import { PUBLISH_QUEUE, publicationJobSchema } from '@social-scheduler/shared';
import { expect, it } from 'vitest';
import { PostsService } from '../../apps/api/src/modules/workspace/posts.service.js';
import { createPublicationProcessor } from '../../apps/worker/src/publishing/processor.js';
import { reconcilePublications } from '../../apps/worker/src/publishing/reconcile.js';
import { createWorkspaceFixture } from './fixtures/workspace.js';
import { testOrigin } from './fixtures/instagram.js';

it('repairs missed scheduling delivery through Redis with ID-only, deduplicated jobs', async () => {
  if (!process.env.TEST_REDIS_URL)
    throw new Error('Set TEST_REDIS_URL to an isolated Redis service');
  const fixture = await createWorkspaceFixture();
  const connection = {
    ...redisConnectionOptions(process.env.TEST_REDIS_URL),
    maxRetriesPerRequest: null,
  };
  const queue = new Queue(PUBLISH_QUEUE, { connection });
  const processPublication = createPublicationProcessor({
    db: fixture.db,
    client: fixture.client,
    tokens: fixture.tokens,
    storage: fixture.storage,
  });
  const worker = new Worker(
    PUBLISH_QUEUE,
    async (job) => {
      await processPublication(publicationJobSchema.parse(job.data).publicationId);
    },
    { connection, autorun: false },
  );
  try {
    const upload = await fixture.agent
      .post('/api/workspace/media')
      .set('Origin', testOrigin)
      .set('Content-Type', 'image/jpeg')
      .send(fixture.photo);
    const post = await new PostsService(fixture.db, fixture.storage).save(fixture.userId, {
      caption: 'Queue recovery test',
      mediaAssetId: upload.body.id,
      socialAccountId: fixture.channel.id,
      scheduledAt: new Date(Date.now() + 120000).toISOString(),
      timezone: 'UTC',
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
    let timer: ReturnType<typeof setTimeout>;
    const completion = new Promise<void>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Queue completion timed out')), 10000);
      worker.once('completed', () => {
        clearTimeout(timer);
        resolve();
      });
      worker.once('failed', () => {
        clearTimeout(timer);
        reject(new Error('Publication job failed'));
      });
      worker.once('error', reject);
    });
    const running = worker.run();
    await completion;
    expect(
      (await fixture.db.publication.findUniqueOrThrow({ where: { id: post.publicationId } }))
        .status,
    ).toBe('PUBLISHED');
    expect(fixture.state.publishCalls).toBe(1);
    await worker.close();
    await running;
  } finally {
    await worker.close();
    await queue.close();
    await fixture.close();
  }
});
