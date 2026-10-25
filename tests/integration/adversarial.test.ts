import request from 'supertest';
import { createHmac } from 'node:crypto';
import type { Server } from 'node:http';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { PostsService } from '../../backend/src/services/posts.service.js';
import { createWorkspaceFixture } from './fixtures/workspace.js';
import { testOrigin, testSecret } from './fixtures/instagram.js';

let owner: Awaited<ReturnType<typeof createWorkspaceFixture>>;
let other: Awaited<ReturnType<typeof createWorkspaceFixture>>;
let mediaId: string;
const servers: Server[] = [];
beforeAll(async () => {
  owner = await createWorkspaceFixture({ accountId: 'regression-owner' });
  other = await createWorkspaceFixture({ accountId: 'regression-other' });
  for (const fixture of [owner, other]) {
    const server = fixture.app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    servers.push(server);
    // Preserve the authenticated cookie while moving concurrent requests to a
    // persistent listener instead of racing Supertest's temporary server startup.
    const session = await fixture.db.session.findFirstOrThrow({
      where: { userId: fixture.userId },
    });
    fixture.agent = request.agent(server);
    fixture.agent.set(
      'Cookie',
      `better-auth.session_token=${encodeURIComponent(`${session.token}.${createHmac('sha256', testSecret).update(session.token).digest('base64')}`)}`,
    );
  }
  const upload = await owner.agent
    .post('/api/workspace/media')
    .set('Origin', testOrigin)
    .set('Content-Type', 'image/jpeg')
    .send(owner.photo);
  expect(upload.status).toBe(201);
  mediaId = upload.body.id;
});
afterAll(async () => {
  await Promise.all(
    servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
  await owner?.close();
  await other?.close();
});

it('invalidates open editor revisions when a failed post is retried', async () => {
  await owner.db.rateLimit.deleteMany();
  const post = await draft();
  await owner.db.publication.updateMany({ where: { postId: post.id }, data: { status: 'FAILED' } });
  expect(
    (await owner.agent.post(`/api/workspace/posts/${post.id}/retry`).set('Origin', testOrigin))
      .status,
  ).toBe(200);
  expect(
    (
      await owner.agent
        .put(`/api/workspace/posts/${post.id}`)
        .set('Origin', testOrigin)
        .send({ ...payload(), revision: post.updatedAt })
    ).status,
  ).toBe(409);
});

it('preserves cancellation when an editor save races it', async () => {
  const service = new PostsService(owner.db, owner.storage);
  for (let i = 0; i < 10; i++) {
    const post = await service.save(owner.userId, payload());
    const results = await Promise.allSettled([
      service.cancel(owner.userId, post.id),
      service.save(
        owner.userId,
        { ...payload(), scheduledAt: new Date(Date.now() + 120000).toISOString() },
        post.id,
        post.updatedAt,
      ),
    ]);
    expect(results[0]?.status).toBe('fulfilled');
    expect(
      (await owner.db.publication.findUniqueOrThrow({ where: { id: post.publicationId } })).status,
    ).toBe('CANCELLED');
  }
});
const payload = () => ({
  caption: 'Adversarial draft',
  mediaAssetId: mediaId,
  socialAccountId: owner.channel.id,
  scheduledAt: null,
  timezone: 'Asia/Kathmandu',
});
async function draft() {
  const result = await owner.agent
    .post('/api/workspace/posts')
    .set('Origin', testOrigin)
    .send(payload());
  expect(result.status).toBe(201);
  return result.body as { id: string; updatedAt: string };
}

it('keeps session checks available beyond the shared 100-request bucket', async () => {
  const results = await Promise.all(
    Array.from({ length: 120 }, () => owner.agent.get('/api/auth/get-session')),
  );
  expect(
    results.every((result) => result.status === 200 && result.body.user.id === owner.userId),
  ).toBe(true);
});

it('retains atomic credential throttling after exempting read-only session checks', async () => {
  await owner.db.rateLimit.deleteMany();
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      request(owner.app).post('/api/auth/sign-in/email').set('Origin', testOrigin).send({
        email: 'nonexistent-regression@example.invalid',
        password: 'wrong-but-long-passphrase',
      }),
    ),
  );
  expect(results.filter((result) => result.status === 401)).toHaveLength(5);
  expect(results.filter((result) => result.status === 429)).toHaveLength(5);
});

it('allows only one simultaneous save of the same revision', async () => {
  await owner.db.rateLimit.deleteMany();
  const post = await draft();
  const results = await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      owner.agent
        .put(`/api/workspace/posts/${post.id}`)
        .set('Origin', testOrigin)
        .send({ ...payload(), caption: `Concurrent ${index}`, revision: post.updatedAt }),
    ),
  );
  expect(results.filter((r) => r.status === 200)).toHaveLength(1);
  expect(results.filter((r) => r.status === 409)).toHaveLength(19);
});

it('invalidates open editor revisions when a post is cancelled', async () => {
  await owner.db.rateLimit.deleteMany();
  const post = await draft();
  expect(
    (await owner.agent.post(`/api/workspace/posts/${post.id}/cancel`).set('Origin', testOrigin))
      .status,
  ).toBe(200);
  const stale = await owner.agent
    .put(`/api/workspace/posts/${post.id}`)
    .set('Origin', testOrigin)
    .send({
      ...payload(),
      revision: post.updatedAt,
      scheduledAt: new Date(Date.now() + 120000).toISOString(),
    });
  expect(stale.status).toBe(409);
  expect((await owner.db.publication.findFirstOrThrow({ where: { postId: post.id } })).status).toBe(
    'CANCELLED',
  );
});

it('rejects foreign post/media/account mutations and private previews', async () => {
  const post = await draft();
  for (const action of [
    () =>
      other.agent
        .put(`/api/workspace/posts/${post.id}`)
        .set('Origin', testOrigin)
        .send({ ...payload(), revision: post.updatedAt }),
    () => other.agent.delete(`/api/workspace/posts/${post.id}`).set('Origin', testOrigin),
    () => other.agent.get(`/api/workspace/media/${mediaId}`),
    () => other.agent.post('/api/workspace/posts').set('Origin', testOrigin).send(payload()),
  ])
    expect((await action()).status).toBe(404);
  expect(
    (await other.agent.post(`/api/workspace/posts/${post.id}/cancel`).set('Origin', testOrigin))
      .status,
  ).toBe(409);
  expect((await owner.db.publication.findFirstOrThrow({ where: { postId: post.id } })).status).toBe(
    'DRAFT',
  );
});

it('atomically enforces per-user mutation limits under a simultaneous burst', async () => {
  await owner.db.rateLimit.deleteMany();
  const results = await Promise.all(
    Array.from({ length: 45 }, () =>
      owner.agent.post('/api/workspace/posts').set('Origin', testOrigin).send({}),
    ),
  );
  expect(results.filter((r) => r.status === 422)).toHaveLength(30);
  expect(results.filter((r) => r.status === 429)).toHaveLength(15);
  expect(
    results.filter((r) => r.status === 429).every((r) => r.headers['retry-after'] === '60'),
  ).toBe(true);
});

it('rejects forged session cookies and malicious JSON fields without changing records', async () => {
  expect(
    (
      await request(owner.app)
        .get('/api/workspace')
        .set('Cookie', 'better-auth.session_token=forged.signature')
    ).status,
  ).toBe(401);
  await owner.db.rateLimit.deleteMany();
  for (const changes of [
    { caption: 'x'.repeat(2201) },
    { socialAccountId: "' OR 1=1 --" },
    { timezone: '../../etc/passwd' },
    { scheduledAt: 'invalid' },
  ]) {
    expect(
      (
        await owner.agent
          .post('/api/workspace/posts')
          .set('Origin', testOrigin)
          .send({ ...payload(), ...changes })
      ).status,
    ).toBe(422);
  }
});
