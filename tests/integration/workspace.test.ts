import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createWorkspaceFixture } from './fixtures/workspace.js';
import { testOrigin } from './fixtures/instagram.js';
let fixture: Awaited<ReturnType<typeof createWorkspaceFixture>>;
let assetId: string, postId: string, revision: string;
beforeAll(async () => {
  fixture = await createWorkspaceFixture();
});
afterAll(async () => {
  await fixture?.close();
});
const payload = () => ({
  caption: 'A real draft',
  mediaAssetId: assetId,
  socialAccountId: fixture.channel.id,
  scheduledAt: null,
  timezone: 'Asia/Kathmandu',
});
describe('authenticated media and draft lifecycle', () => {
  it('requires sessions and matching origins for writes', async () => {
    expect((await request(fixture.app).get('/api/workspace')).status).toBe(401);
    expect(
      (
        await fixture.agent
          .post('/api/workspace/posts')
          .set('Origin', 'https://evil.example')
          .send({})
      ).status,
    ).toBe(403);
  });
  it('validates image bytes, saves sanitized JPEGs, and exposes only authorized or signed URLs', async () => {
    const bad = await fixture.agent
      .post('/api/workspace/media')
      .set('Origin', testOrigin)
      .set('Content-Type', 'image/jpeg')
      .send(Buffer.from('not-an-image'));
    expect(bad.status).toBe(422);
    const upload = await fixture.agent
      .post('/api/workspace/media')
      .set('Origin', testOrigin)
      .set('Content-Type', 'image/jpeg')
      .send(fixture.photo);
    expect(upload.status).toBe(201);
    assetId = upload.body.id;
    expect((await request(fixture.app).get(`/api/workspace/media/${assetId}`)).status).toBe(401);
    expect((await fixture.agent.get(`/api/workspace/media/${assetId}`)).status).toBe(200);
    const signed = new URL(fixture.storage.publicMediaUrl(assetId));
    expect((await request(fixture.app).get(signed.pathname + signed.search)).status).toBe(200);
    expect(
      (await request(fixture.app).get(signed.pathname + '?expires=0&signature=bad')).status,
    ).toBe(403);
  });
  it('creates and edits drafts with optimistic concurrency', async () => {
    const create = await fixture.agent
      .post('/api/workspace/posts')
      .set('Origin', testOrigin)
      .send(payload());
    expect(create.status).toBe(201);
    postId = create.body.id;
    revision = create.body.updatedAt;
    const edit = await fixture.agent
      .put(`/api/workspace/posts/${postId}`)
      .set('Origin', testOrigin)
      .send({ ...payload(), caption: 'Edited draft', revision });
    expect(edit.status).toBe(200);
    expect(
      (
        await fixture.agent
          .put(`/api/workspace/posts/${postId}`)
          .set('Origin', testOrigin)
          .send({ ...payload(), caption: 'Stale edit', revision })
      ).status,
    ).toBe(409);
    revision = edit.body.updatedAt;
    const workspace = await fixture.agent.get('/api/workspace?view=drafts');
    expect(workspace.body.posts).toHaveLength(1);
    expect(JSON.stringify(workspace.body)).not.toMatch(/long-secret|tokenCiphertext|accessToken/);
  });
});
describe('scheduling guards and ownership', () => {
  it('rejects media owned by another user and invalid timezones', async () => {
    const foreign = await fixture.db.user.create({
      data: { name: 'Foreign', email: 'foreign-workspace-test@example.com' },
    });
    const media = await fixture.db.mediaAsset.create({
      data: {
        userId: foreign.id,
        storageKey: 'foreign-test-photo',
        mimeType: 'image/jpeg',
        type: 'IMAGE',
        status: 'READY',
        sizeBytes: 100,
      },
    });
    try {
      expect(
        (
          await fixture.agent
            .post('/api/workspace/posts')
            .set('Origin', testOrigin)
            .send({ ...payload(), mediaAssetId: media.id })
        ).status,
      ).toBe(404);
      expect(
        (
          await fixture.agent
            .post('/api/workspace/posts')
            .set('Origin', testOrigin)
            .send({ ...payload(), timezone: 'bad-timezone' })
        ).status,
      ).toBe(422);
    } finally {
      await fixture.db.mediaAsset.delete({ where: { id: media.id } });
      await fixture.db.user.delete({ where: { id: foreign.id } });
    }
  });
  it('schedules durably, cancels, resaves, and deletes an unpublished draft', async () => {
    const scheduledAt = new Date(Date.now() + 120000).toISOString();
    const save = await fixture.agent
      .put(`/api/workspace/posts/${postId}`)
      .set('Origin', testOrigin)
      .send({ ...payload(), revision, scheduledAt });
    expect(save.status).toBe(200);
    expect(save.body.status).toBe('SCHEDULED');
    expect(
      (await fixture.agent.delete(`/api/workspace/posts/${postId}`).set('Origin', testOrigin))
        .status,
    ).toBe(409);
    expect(
      (await fixture.agent.post(`/api/workspace/posts/${postId}/cancel`).set('Origin', testOrigin))
        .status,
    ).toBe(200);
    expect(
      (await fixture.agent.delete(`/api/workspace/posts/${postId}`).set('Origin', testOrigin))
        .status,
    ).toBe(200);
    expect(await fixture.db.post.count({ where: { id: postId } })).toBe(0);
  });
});
