import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostsService } from '../../apps/api/src/modules/workspace/posts.service.js';
import { createPublicationProcessor } from '../../apps/worker/src/publishing/processor.js';
import { createWorkspaceFixture } from './fixtures/workspace.js';
import { testOrigin } from './fixtures/instagram.js';
let fixture: Awaited<ReturnType<typeof createWorkspaceFixture>>;
let mediaId: string;
let processor: ReturnType<typeof createPublicationProcessor>;
beforeAll(async () => {
  fixture = await createWorkspaceFixture();
  const upload = await fixture.agent
    .post('/api/workspace/media')
    .set('Origin', testOrigin)
    .set('Content-Type', 'image/jpeg')
    .send(fixture.photo);
  mediaId = upload.body.id;
  processor = createPublicationProcessor({
    db: fixture.db,
    client: fixture.client,
    tokens: fixture.tokens,
    storage: fixture.storage,
  });
});
afterAll(async () => {
  await fixture?.close();
});
async function scheduledPost() {
  fixture.state.containerStatus = 'FINISHED';
  fixture.state.publishTimeout = false;
  const post = await new PostsService(fixture.db, fixture.storage).save(fixture.userId, {
    caption: 'Worker test',
    mediaAssetId: mediaId,
    socialAccountId: fixture.channel.id,
    scheduledAt: new Date(Date.now() + 120000).toISOString(),
    timezone: 'Asia/Kathmandu',
  });
  await fixture.db.publication.update({
    where: { id: post.publicationId },
    data: { scheduledAt: new Date(Date.now() - 1000) },
  });
  return post;
}
describe('durable publication processing', () => {
  it('claims duplicate jobs once, publishes, and records the provider result', async () => {
    const post = await scheduledPost();
    const before = fixture.state.publishCalls;
    await Promise.all([processor(post.publicationId), processor(post.publicationId)]);
    await processor(post.publicationId);
    expect(fixture.state.publishCalls - before).toBe(1);
    const record = await fixture.db.publication.findUniqueOrThrow({
      where: { id: post.publicationId },
      include: { attempts: true },
    });
    expect(record).toMatchObject({
      status: 'PUBLISHED',
      externalPostId: 'remote-post-1',
      leaseToken: null,
    });
    expect(record.attempts).toHaveLength(1);
    expect(record.attempts[0]?.status).toBe('SUCCEEDED');
  });
  it('ignores cancelled posts and catches token expiry before any remote publish', async () => {
    const post = await scheduledPost();
    await new PostsService(fixture.db, fixture.storage).cancel(fixture.userId, post.id);
    const before = fixture.state.publishCalls;
    await processor(post.publicationId);
    expect(fixture.state.publishCalls).toBe(before);
    const expired = await scheduledPost();
    await fixture.db.socialAccount.update({
      where: { id: fixture.channel.id },
      data: { tokenExpiresAt: new Date(0) },
    });
    await processor(expired.publicationId);
    expect(fixture.state.publishCalls).toBe(before);
    expect(
      (await fixture.db.publication.findUniqueOrThrow({ where: { id: expired.publicationId } }))
        .status,
    ).toBe('FAILED');
    expect(
      (await fixture.db.socialAccount.findUniqueOrThrow({ where: { id: fixture.channel.id } }))
        .status,
    ).toBe('EXPIRED');
    await fixture.db.socialAccount.update({
      where: { id: fixture.channel.id },
      data: { status: 'CONNECTED', tokenExpiresAt: new Date(Date.now() + 60 * 86400000) },
    });
  });
  it('resumes an existing container after readiness polling without creating another', async () => {
    const post = await scheduledPost();
    fixture.state.containerStatus = 'IN_PROGRESS';
    const before = fixture.state.containerCalls;
    await processor(post.publicationId);
    expect(
      (await fixture.db.publication.findUniqueOrThrow({ where: { id: post.publicationId } }))
        .status,
    ).toBe('PROCESSING');
    fixture.state.containerStatus = 'FINISHED';
    await fixture.db.publication.update({
      where: { id: post.publicationId },
      data: { leaseExpiresAt: new Date(0) },
    });
    await processor(post.publicationId);
    expect(fixture.state.containerCalls - before).toBe(1);
    expect(
      (await fixture.db.publication.findUniqueOrThrow({ where: { id: post.publicationId } }))
        .status,
    ).toBe('PUBLISHED');
  });
});
describe('ambiguous outcomes and token lifecycle', () => {
  it('never automatically resends after a publish timeout and reconciles a confirmed remote publish', async () => {
    const post = await scheduledPost();
    fixture.state.publishTimeout = true;
    const before = fixture.state.publishCalls;
    await processor(post.publicationId);
    expect(
      (await fixture.db.publication.findUniqueOrThrow({ where: { id: post.publicationId } }))
        .status,
    ).toBe('UNCERTAIN');
    await expect(
      new PostsService(fixture.db, fixture.storage).retry(fixture.userId, post.id),
    ).rejects.toThrow();
    await fixture.db.publication.update({
      where: { id: post.publicationId },
      data: { leaseExpiresAt: new Date(0) },
    });
    await processor(post.publicationId);
    expect(fixture.state.publishCalls - before).toBe(1);
    fixture.state.containerStatus = 'PUBLISHED';
    await fixture.db.publication.update({
      where: { id: post.publicationId },
      data: { leaseExpiresAt: new Date(0) },
    });
    await processor(post.publicationId);
    expect(
      (await fixture.db.publication.findUniqueOrThrow({ where: { id: post.publicationId } }))
        .status,
    ).toBe('PUBLISHED');
    expect(fixture.state.publishCalls - before).toBe(1);
  });
  it('renews only eligible unexpired tokens and marks revoked access without leaking provider errors', async () => {
    await fixture.db.socialAccount.update({
      where: { id: fixture.channel.id },
      data: {
        tokenRefreshedAt: new Date(Date.now() - 2 * 86400000),
        tokenExpiresAt: new Date(Date.now() + 3 * 86400000),
      },
    });
    expect(await fixture.tokens.validToken(fixture.channel.id)).toBe('renewed-secret');
    expect(fixture.state.refreshCalls).toBe(1);
    const saved = await fixture.db.socialAccount.findUniqueOrThrow({
      where: { id: fixture.channel.id },
    });
    expect(saved.tokenExpiresAt!.getTime()).toBeGreaterThan(Date.now() + 59 * 86400000);
    await fixture.tokens.validToken(fixture.channel.id);
    expect(fixture.state.refreshCalls).toBe(1);
    fixture.state.revoked = true;
    await expect(fixture.tokens.validToken(fixture.channel.id)).rejects.toThrow('TOKEN_REVOKED');
    expect(
      await fixture.db.socialAccount.findUniqueOrThrow({ where: { id: fixture.channel.id } }),
    ).toMatchObject({ status: 'REVOKED', tokenCiphertext: null });
  });
});
