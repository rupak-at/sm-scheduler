import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createWorkspaceFixture } from './fixtures/workspace.js';
import { fixtureVideo } from './fixtures/video.js';
import { testOrigin } from './fixtures/instagram.js';
import { PostsService } from '../../backend/src/services/posts.service.js';
import { createPublicationProcessor } from '../../backend/src/worker/publishing/processor.js';

let fixture: Awaited<ReturnType<typeof createWorkspaceFixture>>;
let mediaId: string;
beforeAll(async () => {
  fixture = await createWorkspaceFixture();
});
afterAll(async () => {
  await fixture?.close();
});

describe('Validated MP4 uploads and owned previews', () => {
  it('prepares an actual MP4 and serves authorized full, range, and signed responses', async () => {
    const input = await fixtureVideo();
    const upload = await fixture.agent
      .post('/api/workspace/media')
      .set('Origin', testOrigin)
      .set('Content-Type', 'video/mp4')
      .send(input);
    expect(upload.status).toBe(201);
    expect(upload.body).toMatchObject({ mimeType: 'video/mp4', width: 320, height: 568 });
    mediaId = upload.body.id;
    const stored = await fixture.db.mediaAsset.findUniqueOrThrow({ where: { id: mediaId } });
    expect(stored).toMatchObject({
      type: 'VIDEO',
      mimeType: 'video/mp4',
      storageKey: `${mediaId}.mp4`,
    });
    const full = await fixture.agent.get(upload.body.url);
    expect(full.status).toBe(200);
    expect(full.headers['content-type']).toMatch(/^video\/mp4/);
    expect(full.headers['accept-ranges']).toBe('bytes');
    const range = await fixture.agent.get(upload.body.url).set('Range', 'bytes=0-15');
    expect(range.status).toBe(206);
    expect(range.headers['content-length']).toBe('16');
    expect(range.headers['content-range']).toBe(`bytes 0-15/${stored.sizeBytes}`);
    expect((await fixture.agent.get(upload.body.url).set('Range', 'bytes=999999999-')).status).toBe(
      416,
    );
    expect((await request(fixture.app).get(upload.body.url)).status).toBe(401);
    const signed = new URL(fixture.storage.publicMediaUrl(mediaId));
    const publicPath = signed.pathname + signed.search;
    expect((await request(fixture.app).get(publicPath).set('Range', 'bytes=-16')).status).toBe(206);
    expect((await request(fixture.app).get(signed.pathname)).status).toBe(403);
  });

  it('rejects disguised/corrupt MP4 data and clips outside the duration limit', async () => {
    const before = await fixture.db.mediaAsset.count({ where: { userId: fixture.userId } });
    for (const bytes of [fixture.photo, Buffer.from('invalid'), await fixtureVideo(1)]) {
      const response = await fixture.agent
        .post('/api/workspace/media')
        .set('Origin', testOrigin)
        .set('Content-Type', 'video/mp4')
        .send(bytes);
      expect(response.status).toBe(422);
    }
    expect(await fixture.db.mediaAsset.count({ where: { userId: fixture.userId } })).toBe(before);
  });
});

describe('Durable Reel publishing and recovery', () => {
  it('creates a Reel container once, waits for processing, then publishes without duplicates', async () => {
    const posts = new PostsService(fixture.db, fixture.storage);
    const post = await posts.save(fixture.userId, {
      caption: 'Reel caption\n\n#travel',
      mediaAssetId: mediaId,
      socialAccountId: fixture.channel.id,
      scheduledAt: new Date(Date.now() + 120000).toISOString(),
      timezone: 'UTC',
    });
    expect(post.mediaMimeType).toBe('video/mp4');
    await fixture.db.publication.update({
      where: { id: post.publicationId },
      data: { scheduledAt: new Date(0) },
    });
    const processor = createPublicationProcessor({
      db: fixture.db,
      client: fixture.client,
      tokens: fixture.tokens,
      storage: fixture.storage,
    });
    fixture.state.containerStatus = 'IN_PROGRESS';
    await processor(post.publicationId);
    expect(fixture.state.containerCalls).toBe(1);
    expect(fixture.state.publishCalls).toBe(0);
    const call = fixture.fetcher.mock.calls.find(([input]) =>
      new URL(String(input)).pathname.endsWith('/media'),
    )!;
    const parameters = new URLSearchParams(String(call[1]?.body));
    expect(parameters.get('media_type')).toBe('REELS');
    expect(parameters.get('caption')).toBe('Reel caption\n\n#travel');
    expect(parameters.has('video_url')).toBe(true);
    expect(parameters.has('image_url')).toBe(false);
    await fixture.db.publication.update({
      where: { id: post.publicationId },
      data: { leaseExpiresAt: new Date(0) },
    });
    fixture.state.containerStatus = 'FINISHED';
    await Promise.all([processor(post.publicationId), processor(post.publicationId)]);
    await processor(post.publicationId);
    expect(fixture.state.containerCalls).toBe(1);
    expect(fixture.state.publishCalls).toBe(1);
    expect(
      (await fixture.db.publication.findUniqueOrThrow({ where: { id: post.publicationId } }))
        .status,
    ).toBe('PUBLISHED');
  });

  it('rejects a video/account belonging to another creator', async () => {
    const other = await createWorkspaceFixture({ accountId: '123457' });
    try {
      await expect(
        new PostsService(fixture.db, fixture.storage).save(other.userId, {
          caption: 'Other creator',
          mediaAssetId: mediaId,
          socialAccountId: other.channel.id,
          scheduledAt: null,
          timezone: 'UTC',
        }),
      ).rejects.toMatchObject({ status: 404 });
    } finally {
      await other.close();
    }
  });
});
