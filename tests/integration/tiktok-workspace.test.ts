import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { tiktokSettingsSchema } from '@social-scheduler/shared';
import { createTikTokWorkspaceFixture } from './fixtures/tiktok.js';
import { fixtureVideo } from './fixtures/video.js';
import { testOrigin } from './fixtures/instagram.js';
let fixture: Awaited<ReturnType<typeof createTikTokWorkspaceFixture>>;
let channelId: string, mediaId: string;
const settings = tiktokSettingsSchema.parse({ privacy: 'SELF_ONLY', consent: true });
beforeEach(async () => {
  fixture = await createTikTokWorkspaceFixture();
  channelId = (await fixture.connect()).id;
  const upload = await fixture.agent
    .post('/api/workspace/media')
    .set('Origin', testOrigin)
    .set('Content-Type', 'image/jpeg')
    .send(fixture.photo);
  expect(upload.status).toBe(201);
  mediaId = upload.body.id;
});
afterEach(async () => {
  await fixture.close();
});
const input = () => ({
  caption: 'TikTok draft #tag',
  socialAccountId: channelId,
  mediaAssetId: mediaId,
  scheduledAt: null,
  timezone: 'UTC',
  tiktokSettings: settings,
});
const create = (payload: object) =>
  fixture.agent.post('/api/workspace/posts').set('Origin', testOrigin).send(payload);

describe('TikTok composer trust boundaries', () => {
  it('retrieves current creator settings and round-trips draft choices while resetting consent on reopening', async () => {
    const creator = await fixture.agent.get(`/api/workspace/channels/${channelId}/tiktok/creator`);
    expect(creator.status).toBe(200);
    expect(creator.body.creator.creator_nickname).toBe('TikTok creator');
    const draft = await create(input());
    expect(draft.status).toBe(201);
    expect(draft.body.tiktokSettings).toMatchObject({
      privacy: 'SELF_ONLY',
      consent: false,
      allowComment: false,
    });
    const scheduled = await fixture.agent
      .put(`/api/workspace/posts/${draft.body.id}`)
      .set('Origin', testOrigin)
      .send({
        ...input(),
        revision: draft.body.updatedAt,
        scheduledAt: new Date(Date.now() + 120000).toISOString(),
      });
    expect(scheduled.status).toBe(200);
    const stored = await fixture.db.publication.findUniqueOrThrow({
      where: { id: scheduled.body.publicationId },
    });
    expect(stored.providerMetadata).toHaveProperty('consentedAt');
    expect(stored.providerMetadata).toMatchObject({ tiktok: { consent: true } });
  });
  it('rejects missing consent/privacy, private commercial partnerships and public unaudited accounts', async () => {
    const time = new Date(Date.now() + 120000).toISOString();
    for (const invalid of [
      { ...settings, consent: false },
      { ...settings, privacy: null },
      { ...settings, commercial: true },
      { ...settings, commercial: true, brandedContent: true },
    ]) {
      const response = await create({ ...input(), scheduledAt: time, tiktokSettings: invalid });
      expect(response.status).toBe(422);
    }
    fixture.tiktok.state.privacy = ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'];
    expect((await create({ ...input(), scheduledAt: time })).body.code).toBe(
      'PRIVATE_TEST_ACCOUNT_REQUIRED',
    );
    expect(fixture.tiktok.state.publishCalls).toBe(0);
  });
  it('rejects video dimensions and creator-specific duration and stores actual prepared duration', async () => {
    const upload = await fixture.agent
      .post('/api/workspace/media')
      .set('Origin', testOrigin)
      .set('Content-Type', 'video/mp4')
      .send(await fixtureVideo());
    expect(upload.status).toBe(201);
    const time = new Date(Date.now() + 120000).toISOString();
    const small = await create({ ...input(), mediaAssetId: upload.body.id, scheduledAt: time });
    expect(small.body.code).toBe('VIDEO_EXCEEDS_CREATOR_LIMITS');
    const valid = await fixture.agent
      .post('/api/workspace/media')
      .set('Origin', testOrigin)
      .set('Content-Type', 'video/mp4')
      .send(await fixtureVideo(3, '480x854'));
    const media = await fixture.db.mediaAsset.findUniqueOrThrow({ where: { id: valid.body.id } });
    expect(media.durationSeconds).toBeGreaterThanOrEqual(3);
    fixture.tiktok.state.maxDuration = 2;
    expect(
      (await create({ ...input(), mediaAssetId: valid.body.id, scheduledAt: time })).body.code,
    ).toBe('VIDEO_EXCEEDS_CREATOR_LIMITS');
  });
});

describe('TikTok creator/media ownership', () => {
  it('checks current publishing access instead of reporting a healthy connection after that scope is revoked', async () => {
    fixture.tiktok.state.scopeRevoked = true;
    const response = await fixture.agent
      .post(`/api/workspace/channels/${channelId}/validate`)
      .set('Origin', testOrigin)
      .send({});
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('PERMISSION_REQUIRED');
    expect(fixture.tiktok.state.publishCalls).toBe(0);
  });
  it('rejects foreign account/settings/media requests before using the account token', async () => {
    const other = await createTikTokWorkspaceFixture();
    try {
      const calls = fixture.tiktok.fetcher.mock.calls.length;
      expect(
        (await other.agent.get(`/api/workspace/channels/${channelId}/tiktok/creator`)).status,
      ).toBe(404);
      expect(
        (await other.agent.post('/api/workspace/posts').set('Origin', testOrigin).send(input()))
          .status,
      ).toBe(404);
      const foreign = await fixture.db.mediaAsset.create({
        data: {
          userId: other.userId,
          storageKey: 'foreign-' + other.userId,
          mimeType: 'image/jpeg',
          type: 'IMAGE',
          status: 'READY',
          sizeBytes: 1,
        },
      });
      expect(
        (
          await create({
            ...input(),
            mediaAssetId: foreign.id,
            scheduledAt: new Date(Date.now() + 120000).toISOString(),
          })
        ).status,
      ).toBe(422);
      expect(fixture.tiktok.fetcher.mock.calls).toHaveLength(calls);
    } finally {
      await other.close();
    }
  });
});
