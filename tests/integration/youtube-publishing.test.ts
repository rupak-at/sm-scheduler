import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest';
import { youtubeSettingsSchema } from '@social-scheduler/shared';
import { createYouTubeWorkspaceFixture } from './fixtures/youtube.js';
import { fixtureVideo } from './fixtures/video.js';
import { testOrigin } from './fixtures/instagram.js';
import { PostsService } from '../../backend/src/services/posts.service.js';
import { createPublicationProcessor } from '../../backend/src/worker/publishing/processor.js';

let fixture: Awaited<ReturnType<typeof createYouTubeWorkspaceFixture>>;
let mediaId: string, channelId: string;
let processor: ReturnType<typeof createPublicationProcessor>;
beforeAll(async () => {
  fixture = await createYouTubeWorkspaceFixture();
  channelId = (await fixture.connect()).id;
  const upload = await fixture.agent
    .post('/api/workspace/media')
    .set('Origin', testOrigin)
    .set('Content-Type', 'video/mp4')
    .send(await fixtureVideo());
  expect(upload.status).toBe(201);
  mediaId = upload.body.id;
  processor = createPublicationProcessor({
    db: fixture.db,
    storage: fixture.storage,
    youtube: fixture.youtube,
  });
});
beforeEach(() => {
  Object.assign(fixture.youtube.state, {
    initTimeout: false,
    quotaExceeded: false,
    sendTimeout: false,
    completed: false,
    partial: 0,
    expiredSession: false,
    evilLocation: false,
    processing: false,
    privacy: 'private',
    uploadStatus: 'processed',
    revoked: false,
  });
});
afterAll(async () => {
  await fixture?.close();
});
async function scheduled() {
  const post = await new PostsService(
    fixture.db,
    fixture.storage,
    false,
    false,
    undefined,
    fixture.youtube,
  ).save(fixture.userId, {
    caption: 'Worker video',
    mediaAssetId: mediaId,
    socialAccountId: channelId,
    scheduledAt: new Date(Date.now() + 120000).toISOString(),
    timezone: 'UTC',
    youtubeSettings: youtubeSettingsSchema.parse({
      title: 'Test title',
      privacy: 'private',
      madeForKids: false,
      consent: true,
    }),
  });
  await fixture.db.publication.update({
    where: { id: post.publicationId },
    data: { scheduledAt: new Date(0) },
  });
  return post.publicationId;
}
const record = (id: string) =>
  fixture.db.publication.findUniqueOrThrow({ where: { id }, include: { attempts: true } });
const expire = (id: string) =>
  fixture.db.publication.update({ where: { id }, data: { leaseExpiresAt: new Date(0) } });

it('deduplicates concurrent delivery, encrypts the resumable session, and waits for processed visibility', async () => {
  const id = await scheduled();
  fixture.youtube.state.processing = true;
  const before = fixture.youtube.state.sendCalls;
  await Promise.all([processor(id), processor(id)]);
  expect((await record(id)).status).toBe('PROCESSING');
  expect(fixture.youtube.state.sendCalls - before).toBe(1);
  expect(JSON.stringify((await record(id)).providerMetadata)).not.toContain('fixture-capability');
  fixture.youtube.state.processing = false;
  await expire(id);
  await processor(id);
  expect(await record(id)).toMatchObject({ status: 'PUBLISHED', externalPostId: 'video-1' });
  expect((await record(id)).attempts).toHaveLength(1);
  expect(fixture.youtube.state.sendCalls - before).toBe(1);
});

it('recovers a lost completed response by probing the saved session without uploading again', async () => {
  const id = await scheduled();
  fixture.youtube.state.sendTimeout = true;
  const before = fixture.youtube.state.sendCalls;
  await processor(id);
  expect((await record(id)).status).toBe('UNCERTAIN');
  fixture.youtube.state.sendTimeout = false;
  await expire(id);
  await processor(id);
  expect((await record(id)).status).toBe('PUBLISHED');
  expect(fixture.youtube.state.sendCalls - before).toBe(1);
  expect(fixture.youtube.state.probes).toBeGreaterThan(0);
});

it('retries a definite initialization quota rejection without treating it as an accepted upload', async () => {
  const id = await scheduled();
  fixture.youtube.state.quotaExceeded = true;
  const before = fixture.youtube.state.sendCalls;
  await processor(id);
  expect(await record(id)).toMatchObject({ status: 'PROCESSING', publishRequestedAt: null });
  fixture.youtube.state.quotaExceeded = false;
  await expire(id);
  await processor(id);
  expect((await record(id)).status).toBe('PUBLISHED');
  expect(fixture.youtube.state.sendCalls - before).toBe(1);
});

it('resumes only the bytes following the server-confirmed partial range', async () => {
  const id = await scheduled();
  fixture.youtube.state.sendTimeout = true;
  await processor(id);
  fixture.youtube.state.sendTimeout = false;
  fixture.youtube.state.completed = false;
  fixture.youtube.state.partial = 16;
  await expire(id);
  await processor(id);
  expect((await record(id)).status).toBe('PUBLISHED');
  const last = fixture.youtube.fetcher.mock.calls
    .filter(([, init]) => new Headers(init?.headers).get('Content-Range')?.startsWith('bytes 16-'))
    .at(-1);
  expect(last).toBeDefined();
});

it('never replaces a lost init or expired session with a fresh upload', async () => {
  const id = await scheduled();
  fixture.youtube.state.initTimeout = true;
  const before = fixture.youtube.state.initCalls;
  await processor(id);
  await expire(id);
  await processor(id);
  expect((await record(id)).status).toBe('UNCERTAIN');
  expect(fixture.youtube.state.initCalls - before).toBe(1);
  fixture.youtube.state.initTimeout = false;
  const expired = await scheduled();
  fixture.youtube.state.sendTimeout = true;
  await processor(expired);
  fixture.youtube.state.sendTimeout = false;
  fixture.youtube.state.expiredSession = true;
  const sent = fixture.youtube.state.sendCalls;
  await expire(expired);
  await processor(expired);
  expect((await record(expired)).status).toBe('UNCERTAIN');
  expect(fixture.youtube.state.sendCalls).toBe(sent);
});

it('rejects a malicious session destination and terminal processing/privacy failures', async () => {
  const malicious = await scheduled();
  fixture.youtube.state.evilLocation = true;
  const before = fixture.youtube.state.sendCalls;
  await processor(malicious);
  expect(fixture.youtube.state.sendCalls).toBe(before);
  fixture.youtube.state.evilLocation = false;
  const failed = await scheduled();
  fixture.youtube.state.uploadStatus = 'rejected';
  await processor(failed);
  expect((await record(failed)).status).toBe('FAILED');
  fixture.youtube.state.uploadStatus = 'processed';
  const privacy = await scheduled();
  fixture.youtube.state.privacy = 'public';
  await processor(privacy);
  expect((await record(privacy)).status).toBe('FAILED');
});
