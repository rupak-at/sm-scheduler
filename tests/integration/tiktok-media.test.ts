import request from 'supertest';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { tiktokSettingsSchema } from '@social-scheduler/shared';
import { createTikTokWorkspaceFixture } from './fixtures/tiktok.js';
import { fixtureVideo } from './fixtures/video.js';
import { testOrigin } from './fixtures/instagram.js';
import { PostsService } from '../../backend/src/services/posts.service.js';
import { createPublicationProcessor } from '../../backend/src/worker/publishing/processor.js';
let fixture: Awaited<ReturnType<typeof createTikTokWorkspaceFixture>>;
beforeEach(async () => {
  fixture = await createTikTokWorkspaceFixture();
});
afterEach(async () => {
  await fixture.close();
});
async function start(video: boolean) {
  const account = await fixture.connect();
  const bytes = video
    ? await fixtureVideo(3, '480x854')
    : await sharp({ create: { width: 1440, height: 1800, channels: 3, background: '#ededed' } })
        .jpeg()
        .toBuffer();
  const upload = await fixture.agent
    .post('/api/workspace/media')
    .set('Origin', testOrigin)
    .set('Content-Type', video ? 'video/mp4' : 'image/jpeg')
    .send(bytes);
  expect(upload.status).toBe(201);
  const post = await new PostsService(
    fixture.db,
    fixture.storage,
    false,
    false,
    fixture.tiktok,
  ).save(fixture.userId, {
    caption: 'TikTok media',
    mediaAssetId: upload.body.id,
    socialAccountId: account.id,
    scheduledAt: new Date(Date.now() + 120000).toISOString(),
    timezone: 'UTC',
    tiktokSettings: tiktokSettingsSchema.parse({ privacy: 'SELF_ONLY', consent: true }),
  });
  await fixture.db.publication.update({
    where: { id: post.publicationId },
    data: { scheduledAt: new Date(0) },
  });
  await createPublicationProcessor({
    db: fixture.db,
    storage: fixture.storage,
    tiktok: fixture.tiktok,
  })(post.publicationId);
  const call = fixture.tiktok.fetcher.mock.calls.find(([url]) => String(url).endsWith('/init/'))!;
  const source = JSON.parse(String(call[1]?.body)).source_info;
  const url = new URL(video ? source.video_url : source.photo_images[0]);
  return { post, path: url.pathname + url.search };
}

describe('TikTok signed media endpoint', () => {
  it('serves a normalized JPEG within 1080px directly without a session or redirect and rejects invalid authorization', async () => {
    const { post, path } = await start(false);
    const response = await request(fixture.app).get(path);
    expect(response.status).toBe(200);
    expect(response.headers.location).toBeUndefined();
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.headers['content-type']).toContain('image/jpeg');
    const image = await sharp(response.body).metadata();
    expect(image.width).toBeLessThanOrEqual(1080);
    expect(image.height).toBeLessThanOrEqual(1080);
    const invalid = new URL(path, 'https://api.test.example');
    invalid.searchParams.set('signature', 'wrong');
    expect((await request(fixture.app).get(invalid.pathname + invalid.search)).status).toBe(403);
    invalid.searchParams.set('expires', '1');
    expect((await request(fixture.app).get(invalid.pathname + invalid.search)).status).toBe(403);
    await fixture.db.publication.update({
      where: { id: post.publicationId },
      data: { status: 'CANCELLED' },
    });
    expect((await request(fixture.app).get(path)).status).toBe(404);
  });
  it('supports MP4 byte ranges without redirecting and denies changed asset ownership', async () => {
    const { post, path } = await start(true);
    const range = await request(fixture.app).get(path).set('Range', 'bytes=0-99');
    expect(range.status).toBe(206);
    expect(range.headers['content-length']).toBe('100');
    expect(range.headers['content-type']).toContain('video/mp4');
    const other = await createTikTokWorkspaceFixture();
    try {
      await fixture.db.mediaAsset.update({
        where: { id: post.mediaAssetId },
        data: { userId: other.userId },
      });
      expect((await request(fixture.app).get(path)).status).toBe(404);
      await fixture.db.mediaAsset.update({
        where: { id: post.mediaAssetId },
        data: { userId: fixture.userId },
      });
    } finally {
      await other.close();
    }
  });
});
