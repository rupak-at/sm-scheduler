import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFacebookWorkspaceFixture } from './fixtures/facebook.js';
import { saveFacebookPages } from '../../backend/src/integrations/facebook/accounts.js';
import { PostsService } from '../../backend/src/services/posts.service.js';
import { createPublicationProcessor } from '../../backend/src/worker/publishing/processor.js';
import { testOrigin } from './fixtures/instagram.js';
let fixture: Awaited<ReturnType<typeof createFacebookWorkspaceFixture>>;
let pageId: string;
let mediaId: string;
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
      where: { provider: 'FACEBOOK', userId: fixture.userId },
    })
  ).id;
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
  caption: 'Page caption #test',
  socialAccountId: pageId,
  mediaAssetId: mediaId,
  scheduledAt: null,
  timezone: 'UTC',
});

describe('Facebook draft authorization and scheduling', () => {
  it('creates and edits a Page draft with captions through the API, then schedules it', async () => {
    const created = await fixture.agent
      .post('/api/workspace/posts')
      .set('Origin', testOrigin)
      .send(input());
    expect(created.status).toBe(201);
    const updated = await fixture.agent
      .put(`/api/workspace/posts/${created.body.id}`)
      .set('Origin', testOrigin)
      .send({
        ...input(),
        caption: 'Edited caption #photo',
        revision: created.body.updatedAt,
        scheduledAt: new Date(Date.now() + 120000).toISOString(),
      });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      caption: 'Edited caption #photo',
      socialAccountId: pageId,
      status: 'SCHEDULED',
    });
    expect((await fixture.agent.get('/api/workspace?view=scheduled')).body.counts.scheduled).toBe(
      1,
    );
  });
  it('checks provider configuration, expiry and token presence before scheduling', async () => {
    const disabled = new PostsService(fixture.db, fixture.storage, true, false);
    await disabled.save(fixture.userId, input());
    await expect(
      disabled.save(fixture.userId, {
        ...input(),
        scheduledAt: new Date(Date.now() + 120000).toISOString(),
      }),
    ).rejects.toThrow('Configure this provider');
    await fixture.db.socialAccount.update({
      where: { id: pageId },
      data: { tokenExpiresAt: new Date(0) },
    });
    const posts = new PostsService(fixture.db, fixture.storage, false, true);
    await expect(
      posts.save(fixture.userId, {
        ...input(),
        scheduledAt: new Date(Date.now() + 120000).toISOString(),
      }),
    ).rejects.toThrow('Reconnect');
    await fixture.db.socialAccount.update({
      where: { id: pageId },
      data: { tokenExpiresAt: null, tokenCiphertext: null },
    });
    await expect(
      posts.save(fixture.userId, {
        ...input(),
        scheduledAt: new Date(Date.now() + 120000).toISOString(),
      }),
    ).rejects.toThrow('Reconnect');
  });
  it('marks data-access expiry and revoked access rather than refreshing Facebook tokens as Instagram tokens', async () => {
    fixture.facebook.state.dataExpiresAt = 1;
    await expect(fixture.facebook.tokens.validToken(pageId)).rejects.toThrow('TOKEN_EXPIRED');
    expect(
      (await fixture.db.socialAccount.findUniqueOrThrow({ where: { id: pageId } })).status,
    ).toBe('EXPIRED');
    fixture.facebook.state.dataExpiresAt = 0;
    await fixture.db.socialAccount.update({ where: { id: pageId }, data: { status: 'CONNECTED' } });
    fixture.facebook.state.revoked = true;
    await expect(fixture.facebook.tokens.validToken(pageId)).rejects.toThrow('TOKEN_REVOKED');
    expect(
      await fixture.db.socialAccount.findUniqueOrThrow({ where: { id: pageId } }),
    ).toMatchObject({ status: 'REVOKED', tokenCiphertext: null });
    expect(
      fixture.facebook.fetcher.mock.calls.some(([url]) =>
        String(url).includes('refresh_access_token'),
      ),
    ).toBe(false);
  });
});

describe('Facebook ownership at the API and worker boundaries', () => {
  it('cannot target another workspace’s account or media or operate its channels', async () => {
    const other = await createFacebookWorkspaceFixture();
    try {
      expect(
        (await other.agent.post('/api/workspace/posts').set('Origin', testOrigin).send(input()))
          .status,
      ).toBe(404);
      for (const action of ['validate', 'disconnect'])
        expect(
          (
            await other.agent
              .post(`/api/workspace/channels/${pageId}/${action}`)
              .set('Origin', testOrigin)
              .send({})
          ).status,
        ).toBe(404);
      const invalidMedia = await fixture.db.mediaAsset.create({
        data: {
          userId: other.userId,
          storageKey: 'other-photo-' + other.userId,
          mimeType: 'image/jpeg',
          type: 'IMAGE',
          status: 'READY',
          sizeBytes: 1,
        },
      });
      expect(
        (
          await fixture.agent
            .post('/api/workspace/posts')
            .set('Origin', testOrigin)
            .send({ ...input(), mediaAssetId: invalidMedia.id })
        ).status,
      ).toBe(404);
    } finally {
      await other.close();
    }
  });
  it('refuses cross-owner database relations before contacting Facebook', async () => {
    const other = await createFacebookWorkspaceFixture();
    try {
      const post = await new PostsService(fixture.db, fixture.storage, false, true).save(
        fixture.userId,
        { ...input(), scheduledAt: new Date(Date.now() + 120000).toISOString() },
      );
      await fixture.db.socialAccount.update({
        where: { id: pageId },
        data: { userId: other.userId },
      });
      await fixture.db.publication.update({
        where: { id: post.publicationId },
        data: { scheduledAt: new Date(0) },
      });
      const calls = fixture.facebook.fetcher.mock.calls.length;
      await createPublicationProcessor({
        db: fixture.db,
        storage: fixture.storage,
        facebook: fixture.facebook,
      })(post.publicationId);
      expect(
        (await fixture.db.publication.findUniqueOrThrow({ where: { id: post.publicationId } }))
          .status,
      ).toBe('FAILED');
      expect(fixture.facebook.fetcher.mock.calls).toHaveLength(calls);
      await fixture.db.socialAccount.update({
        where: { id: pageId },
        data: { userId: fixture.userId },
      });
    } finally {
      await other.close();
    }
  });
});
