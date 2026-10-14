import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createFacebookWorkspaceFixture } from './fixtures/facebook.js';
import { testOrigin } from './fixtures/instagram.js';
import { saveFacebookPages } from '../../backend/src/integrations/facebook/accounts.js';
import { PostsService } from '../../backend/src/services/posts.service.js';
import { createPublicationProcessor } from '../../backend/src/worker/publishing/processor.js';
import { fixtureVideo } from './fixtures/video.js';
let fixture: Awaited<ReturnType<typeof createFacebookWorkspaceFixture>>;
let pageId: string;
let processor: ReturnType<typeof createPublicationProcessor>;
beforeEach(async () => {
  fixture = await createFacebookWorkspaceFixture();
  await saveFacebookPages(
    fixture.db,
    fixture.facebook.vault,
    await fixture.facebook.client.exchange('code'),
    fixture.userId,
  );
  pageId = (
    await fixture.db.socialAccount.findFirstOrThrow({
      where: { userId: fixture.userId, provider: 'FACEBOOK' },
    })
  ).id;
  processor = createPublicationProcessor({
    db: fixture.db,
    storage: fixture.storage,
    facebook: fixture.facebook,
  });
});
afterEach(async () => {
  await fixture.close();
});
const posts = () => new PostsService(fixture.db, fixture.storage, false, true);
async function scheduled(video = false) {
  const bytes = video ? await fixtureVideo() : fixture.photo;
  const upload = await fixture.agent
    .post('/api/workspace/media')
    .set('Origin', testOrigin)
    .set('Content-Type', video ? 'video/mp4' : 'image/jpeg')
    .send(bytes);
  expect(upload.status).toBe(201);
  const post = await posts().save(fixture.userId, {
    caption: 'Facebook caption\n\n#test',
    mediaAssetId: upload.body.id,
    socialAccountId: pageId,
    scheduledAt: new Date(Date.now() + 120000).toISOString(),
    timezone: 'Asia/Kathmandu',
  });
  await fixture.db.publication.update({
    where: { id: post.publicationId },
    data: { scheduledAt: new Date(0) },
  });
  return post;
}
async function resume(id: string) {
  await fixture.db.publication.update({ where: { id }, data: { leaseExpiresAt: new Date(0) } });
  await processor(id);
}
const record = (id: string) => fixture.db.publication.findUniqueOrThrow({ where: { id } });

describe('Facebook photos and scheduling safety', () => {
  it('publishes one captioned photo after concurrent duplicate jobs, with durable send marker and attempt', async () => {
    const post = await scheduled();
    await Promise.all([processor(post.publicationId), processor(post.publicationId)]);
    await processor(post.publicationId);
    expect(await record(post.publicationId)).toMatchObject({
      status: 'PUBLISHED',
      externalPostId: '778899_112233',
    });
    expect((await record(post.publicationId)).publishRequestedAt).not.toBeNull();
    expect(fixture.facebook.state.photoCalls).toBe(1);
    const call = fixture.facebook.fetcher.mock.calls.find(([input]) =>
      String(input).endsWith('/photos'),
    )!;
    expect(new URLSearchParams(String(call[1]?.body)).get('caption')).toBe(
      'Facebook caption\n\n#test',
    );
    const attempt = await fixture.db.publishAttempt.findFirstOrThrow({
      where: { publicationId: post.publicationId },
    });
    expect(attempt.status).toBe('SUCCEEDED');
  });
  it('rechecks scheduled times, cancellation and disconnection before sending', async () => {
    const post = await scheduled();
    await fixture.db.publication.update({
      where: { id: post.publicationId },
      data: { scheduledAt: new Date(Date.now() + 120000) },
    });
    await processor(post.publicationId);
    expect(fixture.facebook.state.photoCalls).toBe(0);
    await posts().cancel(fixture.userId, post.id);
    await processor(post.publicationId);
    const disconnected = await scheduled();
    await fixture.agent
      .post(`/api/workspace/channels/${pageId}/disconnect`)
      .set('Origin', testOrigin)
      .send({});
    await processor(disconnected.publicationId);
    expect((await record(disconnected.publicationId)).status).toBe('FAILED');
    expect(fixture.facebook.state.photoCalls).toBe(0);
  });
});

describe('Facebook publication outcomes and grants', () => {
  it('keeps lost write responses uncertain and blocks both automatic and manual resend', async () => {
    const post = await scheduled();
    fixture.facebook.state.publishTimeout = true;
    await processor(post.publicationId);
    expect((await record(post.publicationId)).status).toBe('UNCERTAIN');
    fixture.facebook.state.publishTimeout = false;
    await resume(post.publicationId);
    await expect(posts().retry(fixture.userId, post.id)).rejects.toThrow();
    await expect(
      posts().save(
        fixture.userId,
        {
          caption: 'copy',
          mediaAssetId: post.mediaAssetId,
          socialAccountId: pageId,
          scheduledAt: null,
          timezone: 'UTC',
        },
        post.id,
        post.updatedAt,
      ),
    ).rejects.toThrow();
    expect(fixture.facebook.state.photoCalls).toBe(1);
  });
  it('allows a deliberate retry after a definite provider rejection, with a new attempt', async () => {
    const post = await scheduled();
    fixture.facebook.state.publishRejected = true;
    await processor(post.publicationId);
    expect(await record(post.publicationId)).toMatchObject({
      status: 'FAILED',
      publishRequestedAt: null,
    });
    await posts().retry(fixture.userId, post.id);
    fixture.facebook.state.publishRejected = false;
    await fixture.db.publication.update({
      where: { id: post.publicationId },
      data: { scheduledAt: new Date(0) },
    });
    await processor(post.publicationId);
    expect((await record(post.publicationId)).status).toBe('PUBLISHED');
    expect(
      await fixture.db.publishAttempt.count({ where: { publicationId: post.publicationId } }),
    ).toBe(2);
  });
  it('marks missing/revoked grants and data-access expiry before any media writes', async () => {
    const post = await scheduled();
    fixture.facebook.state.denied = true;
    await processor(post.publicationId);
    expect(
      (await fixture.db.socialAccount.findUniqueOrThrow({ where: { id: pageId } })).status,
    ).toBe('REVOKED');
    expect(fixture.facebook.state.photoCalls).toBe(0);
  });
});

describe('Facebook asynchronous video publishing', () => {
  it('waits for processing and public status, then resumes by saved ID without reuploading', async () => {
    const post = await scheduled(true);
    await processor(post.publicationId);
    expect(await record(post.publicationId)).toMatchObject({
      status: 'PROCESSING',
      externalContainerId: '990011',
      publishedAt: null,
    });
    fixture.facebook.state.videoReady = true;
    await resume(post.publicationId);
    expect((await record(post.publicationId)).status).toBe('PROCESSING');
    fixture.facebook.state.videoPublished = true;
    await resume(post.publicationId);
    expect(await record(post.publicationId)).toMatchObject({
      status: 'PUBLISHED',
      externalPostId: '990011',
    });
    expect(fixture.facebook.state.videoCalls).toBe(1);
    const call = fixture.facebook.fetcher.mock.calls.find(([input]) =>
      String(input).endsWith('/videos'),
    )!;
    expect(new URLSearchParams(String(call[1]?.body)).get('description')).toBe(
      'Facebook caption\n\n#test',
    );
    expect(new URLSearchParams(String(call[1]?.body)).get('file_url')).toMatch(/^https:/);
  });
  it('retains the send marker and known ID if a status read fails after video acceptance', async () => {
    const post = await scheduled(true);
    fixture.facebook.state.videoReadDenied = true;
    await processor(post.publicationId);
    const saved = await record(post.publicationId);
    expect(saved.status).toBe('UNCERTAIN');
    expect(saved.publishRequestedAt).not.toBeNull();
    await expect(posts().retry(fixture.userId, post.id)).rejects.toThrow();
    fixture.facebook.state.videoReadDenied = false;
    fixture.facebook.state.videoReady = true;
    fixture.facebook.state.videoPublished = true;
    await resume(post.publicationId);
    expect((await record(post.publicationId)).status).toBe('PUBLISHED');
    expect(fixture.facebook.state.videoCalls).toBe(1);
  });
});
