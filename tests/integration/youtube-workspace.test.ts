import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { youtubeSettingsSchema } from '@social-scheduler/shared';
import { createYouTubeWorkspaceFixture } from './fixtures/youtube.js';
import { fixtureVideo } from './fixtures/video.js';
import { testOrigin } from './fixtures/instagram.js';

let fixture: Awaited<ReturnType<typeof createYouTubeWorkspaceFixture>>;
let channelId: string, mediaId: string;
const settings = youtubeSettingsSchema.parse({
  title: 'Scheduled creator video',
  privacy: 'private',
  madeForKids: false,
  consent: true,
});
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
});
afterAll(async () => {
  await fixture?.close();
});
const input = () => ({
  caption: 'YouTube description #tag',
  mediaAssetId: mediaId,
  socialAccountId: channelId,
  scheduledAt: null,
  timezone: 'Asia/Kathmandu',
  youtubeSettings: settings,
});
const create = (patch = {}) =>
  fixture.agent
    .post('/api/workspace/posts')
    .set('Origin', testOrigin)
    .send({ ...input(), ...patch });

it('round-trips titles/settings and resets consent while hiding upload sessions and credentials', async () => {
  const draft = await create();
  expect(draft.status).toBe(201);
  expect(draft.body.youtubeSettings).toMatchObject({
    title: settings.title,
    privacy: 'private',
    consent: false,
  });
  const schedule = await fixture.agent
    .put(`/api/workspace/posts/${draft.body.id}`)
    .set('Origin', testOrigin)
    .send({
      ...input(),
      revision: draft.body.updatedAt,
      scheduledAt: new Date(Date.now() + 120000).toISOString(),
    });
  expect(schedule.status).toBe(200);
  expect(
    (await fixture.db.publication.findUniqueOrThrow({ where: { id: schedule.body.publicationId } }))
      .providerMetadata,
  ).toHaveProperty('youtubeConsentedAt');
  const workspace = await fixture.agent.get('/api/workspace');
  expect(workspace.body.youtubeConfigured).toBe(true);
  expect(
    workspace.body.channels.some((channel: { provider: string }) => channel.provider === 'YOUTUBE'),
  ).toBe(true);
  expect(JSON.stringify(workspace.body)).not.toMatch(
    /access-|fixture-refresh|tokenCiphertext|uploadSession/,
  );
});

it('rejects missing title/privacy/audience/consent, invalid descriptions, and still photos', async () => {
  for (const patch of [
    { title: '' },
    { privacy: null },
    { madeForKids: null },
    { consent: false },
  ]) {
    expect(
      (
        await create({
          youtubeSettings: { ...settings, ...patch },
          scheduledAt: new Date(Date.now() + 120000).toISOString(),
        })
      ).status,
    ).toBe(422);
  }
  expect(
    (
      await create({
        caption: '😀'.repeat(1000),
        scheduledAt: new Date(Date.now() + 120000).toISOString(),
      })
    ).status,
  ).toBe(201);
  expect(
    (
      await create({
        caption: '漢'.repeat(1700),
        scheduledAt: new Date(Date.now() + 120000).toISOString(),
      })
    ).status,
  ).toBe(422);
  const photo = await fixture.agent
    .post('/api/workspace/media')
    .set('Origin', testOrigin)
    .set('Content-Type', 'image/jpeg')
    .send(fixture.photo);
  expect((await create({ mediaAssetId: photo.body.id })).status).toBe(422);
  expect(fixture.youtube.state.initCalls).toBe(0);
});

it('does not allow foreign media/channels or a one-click retry without review', async () => {
  const other = await createYouTubeWorkspaceFixture();
  try {
    expect(
      (await other.agent.post('/api/workspace/posts').set('Origin', testOrigin).send(input()))
        .status,
    ).toBe(404);
    const draft = await create();
    await fixture.db.publication.updateMany({
      where: { postId: draft.body.id },
      data: { status: 'FAILED' },
    });
    expect(
      (
        await fixture.agent
          .post(`/api/workspace/posts/${draft.body.id}/retry`)
          .set('Origin', testOrigin)
      ).status,
    ).toBe(422);
  } finally {
    await other.close();
  }
});

it('schedules owned legacy video bytes without requiring a public provider-download URL', async () => {
  const publicUrl = vi.spyOn(fixture.storage, 'publicMediaUrl').mockImplementation(() => {
    throw new Error('PUBLIC_MEDIA_URL_REQUIRED');
  });
  try {
    const result = await create({ scheduledAt: new Date(Date.now() + 120000).toISOString() });
    expect(result.status).toBe(201);
    expect(result.body.status).toBe('SCHEDULED');
    expect(publicUrl).not.toHaveBeenCalled();
  } finally {
    publicUrl.mockRestore();
  }
});
