import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { tiktokSettingsSchema } from '@social-scheduler/shared';
import { createTikTokWorkspaceFixture } from './fixtures/tiktok.js';
import { fixtureVideo } from './fixtures/video.js';
import { testOrigin } from './fixtures/instagram.js';
import { PostsService } from '../../backend/src/services/posts.service.js';
import { createPublicationProcessor } from '../../backend/src/worker/publishing/processor.js';
let fixture: Awaited<ReturnType<typeof createTikTokWorkspaceFixture>>;
let channelId: string;
let processor: ReturnType<typeof createPublicationProcessor>;
const settings = tiktokSettingsSchema.parse({ privacy: 'SELF_ONLY', consent: true });
beforeEach(async () => {
  fixture = await createTikTokWorkspaceFixture();
  channelId = (await fixture.connect()).id;
  processor = createPublicationProcessor({
    db: fixture.db,
    storage: fixture.storage,
    tiktok: fixture.tiktok,
  });
});
afterEach(async () => {
  await fixture.close();
});
const posts = () => new PostsService(fixture.db, fixture.storage, false, false, fixture.tiktok);
async function scheduled(video = false) {
  const upload = await fixture.agent
    .post('/api/workspace/media')
    .set('Origin', testOrigin)
    .set('Content-Type', video ? 'video/mp4' : 'image/jpeg')
    .send(video ? await fixtureVideo(3, '480x854') : fixture.photo);
  expect(upload.status).toBe(201);
  const post = await posts().save(fixture.userId, {
    caption: 'TikTok caption\n\n#creator',
    mediaAssetId: upload.body.id,
    socialAccountId: channelId,
    scheduledAt: new Date(Date.now() + 120000).toISOString(),
    timezone: 'Asia/Kathmandu',
    tiktokSettings: settings,
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
const publication = (id: string) => fixture.db.publication.findUniqueOrThrow({ where: { id } });

describe('TikTok asynchronous photo/video processing', () => {
  it.each([false, true])(
    'persists the publish ID, polls to completion and prevents duplicate sends for video=%s',
    async (video) => {
      const post = await scheduled(video);
      if (video) expect(post.mediaDurationSeconds).toBeGreaterThanOrEqual(3);
      await Promise.all([processor(post.publicationId), processor(post.publicationId)]);
      expect(await publication(post.publicationId)).toMatchObject({
        status: 'PROCESSING',
        externalContainerId: 'publish-1',
        publishedAt: null,
      });
      const call = fixture.tiktok.fetcher.mock.calls.find(([url]) =>
        String(url).endsWith('/init/'),
      )!;
      const body = JSON.parse(String(call[1]?.body));
      expect(body.post_info.privacy_level).toBe('SELF_ONLY');
      expect(body.post_info[video ? 'title' : 'description']).toBe(post.caption);
      expect(video ? body.source_info.video_url : body.source_info.photo_images[0]).toContain(
        '/api/media/tiktok/',
      );
      fixture.tiktok.state.status = 'PUBLISH_COMPLETE';
      await resume(post.publicationId);
      expect(await publication(post.publicationId)).toMatchObject({
        status: 'PUBLISHED',
        externalPostId: null,
      });
      expect(fixture.tiktok.state.publishCalls).toBe(1);
      expect(
        (
          await fixture.db.publishAttempt.findFirstOrThrow({
            where: { publicationId: post.publicationId },
          })
        ).status,
      ).toBe('SUCCEEDED');
    },
  );
});

describe('TikTok publish ambiguity and failures', () => {
  it('keeps lost initialize responses uncertain and blocks automatic and manual retry/edit', async () => {
    const post = await scheduled();
    fixture.tiktok.state.publishTimeout = true;
    await processor(post.publicationId);
    expect((await publication(post.publicationId)).status).toBe('UNCERTAIN');
    fixture.tiktok.state.publishTimeout = false;
    await resume(post.publicationId);
    await expect(posts().retry(fixture.userId, post.id)).rejects.toThrow('review');
    await expect(
      posts().save(
        fixture.userId,
        {
          caption: 'copy',
          mediaAssetId: post.mediaAssetId,
          socialAccountId: channelId,
          scheduledAt: null,
          timezone: 'UTC',
          tiktokSettings: settings,
        },
        post.id,
        post.updatedAt,
      ),
    ).rejects.toThrow('no longer');
    expect(fixture.tiktok.state.publishCalls).toBe(1);
  });
  it('reports definite rejection and asynchronous failure without claiming inbox delivery as publication', async () => {
    const rejected = await scheduled();
    fixture.tiktok.state.reject = true;
    await processor(rejected.publicationId);
    expect(await publication(rejected.publicationId)).toMatchObject({
      status: 'FAILED',
      publishRequestedAt: null,
    });
    fixture.tiktok.state.reject = false;
    const inbox = await scheduled();
    fixture.tiktok.state.status = 'SEND_TO_USER_INBOX';
    await processor(inbox.publicationId);
    expect((await publication(inbox.publicationId)).status).toBe('UNCERTAIN');
    const failed = await scheduled();
    fixture.tiktok.state.status = 'FAILED';
    await processor(failed.publicationId);
    expect((await publication(failed.publicationId)).status).toBe('FAILED');
    expect((await publication(failed.publicationId)).publishRequestedAt).not.toBeNull();
  });
});

describe('TikTok state and creator eligibility at send time', () => {
  it('honors future schedules, cancellation and disconnection before contacting a posting endpoint', async () => {
    const post = await scheduled();
    await fixture.db.publication.update({
      where: { id: post.publicationId },
      data: { scheduledAt: new Date(Date.now() + 120000) },
    });
    await processor(post.publicationId);
    await posts().cancel(fixture.userId, post.id);
    await processor(post.publicationId);
    const disconnected = await scheduled();
    await fixture.agent
      .post(`/api/workspace/channels/${channelId}/disconnect`)
      .set('Origin', testOrigin)
      .send({});
    await processor(disconnected.publicationId);
    expect((await publication(disconnected.publicationId)).status).toBe('FAILED');
    expect(fixture.tiktok.state.publishCalls).toBe(0);
  });
  it('rejects changed privacy, interaction settings and blocked creator quotas without altering the selected settings', async () => {
    const post = await scheduled();
    fixture.tiktok.state.privacy = ['FOLLOWER_OF_CREATOR'];
    await processor(post.publicationId);
    expect((await publication(post.publicationId)).status).toBe('FAILED');
    expect(fixture.tiktok.state.publishCalls).toBe(0);
    fixture.tiktok.state.privacy = ['SELF_ONLY'];
    const blocked = await scheduled();
    fixture.tiktok.state.creatorBlocked = true;
    await processor(blocked.publicationId);
    expect((await publication(blocked.publicationId)).status).toBe('FAILED');
    expect(fixture.tiktok.state.publishCalls).toBe(0);
  });
  it('requires a saved per-post consent record even when account authorization exists', async () => {
    const post = await scheduled();
    await fixture.db.publication.update({
      where: { id: post.publicationId },
      data: { providerMetadata: { tiktok: { ...settings, consent: false } } },
    });
    await processor(post.publicationId);
    expect((await publication(post.publicationId)).status).toBe('FAILED');
    expect(fixture.tiktok.state.publishCalls).toBe(0);
  });
});
