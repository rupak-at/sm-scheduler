import { PassThrough } from 'node:stream';
import { access } from 'node:fs/promises';
import request from 'supertest';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse, UploadApiOptions, UploadResponseCallback } from 'cloudinary';
import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { CloudinaryMediaStorage } from '../../backend/src/integrations/cloudinary/storage.js';
import { LocalMediaStorage } from '../../backend/src/lib/media/local-storage.js';
import { createWorkspaceFixture } from './fixtures/workspace.js';
import { fixtureVideo } from './fixtures/video.js';
import { testKey, testOrigin } from './fixtures/instagram.js';
import { PostsService } from '../../backend/src/services/posts.service.js';
import { createPublicationProcessor } from '../../backend/src/worker/publishing/processor.js';

const legacyPath = '/tmp/scheduler-cloudinary-no-local-writes';
const storage = new CloudinaryMediaStorage(
  {
    CLOUDINARY_CLOUD_NAME: 'fixture-cloud',
    CLOUDINARY_API_KEY: '123456',
    CLOUDINARY_API_SECRET: 'fixture-not-a-live-secret',
    CLOUDINARY_FOLDER: 'fixture-scheduler',
  },
  new LocalMediaStorage(legacyPath, testKey, 'https://test.example'),
);
let fixture: Awaited<ReturnType<typeof createWorkspaceFixture>>;
let failure = false;
let photoId: string;
const uploaded: { bytes: Buffer; resource: string | undefined }[] = [];
beforeAll(async () => {
  vi.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation(
    (
      optionsOrCallback: UploadApiOptions | UploadResponseCallback | undefined,
      callback?: UploadResponseCallback,
    ) => {
      const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : undefined;
      const stream = new PassThrough();
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('finish', () => {
        uploaded.push({ bytes: Buffer.concat(chunks), resource: options?.resource_type });
        callback?.(
          failure ? { message: 'secret-provider-body', http_code: 503, name: 'Error' } : undefined,
          failure
            ? undefined
            : ({
                public_id: options?.public_id,
                type: 'authenticated',
                resource_type: options?.resource_type,
                format: options?.resource_type === 'video' ? 'mp4' : 'jpg',
              } as UploadApiResponse),
        );
      });
      return stream as ReturnType<typeof cloudinary.uploader.upload_stream>;
    },
  );
  vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
  fixture = await createWorkspaceFixture({ storage });
});
afterAll(async () => {
  await fixture?.close();
  vi.restoreAllMocks();
});

async function ticket(bytes: Buffer, mimeType = 'image/jpeg') {
  const response = await fixture.agent
    .post('/api/workspace/media/ticket')
    .set('Origin', testOrigin)
    .send({ mimeType, sizeBytes: bytes.length });
  expect(response.status).toBe(201);
  return response.body as { id: string; url: string; token: string };
}
function send(
  authorization: { id: string; token: string },
  bytes: Buffer,
  mimeType = 'image/jpeg',
  origin = testOrigin,
) {
  return request(fixture.app)
    .post(`/api/media/upload/${authorization.id}`)
    .set('Origin', origin)
    .set('Authorization', `Bearer ${authorization.token}`)
    .set('Content-Type', mimeType)
    .send(bytes);
}

it('requires an authenticated matching-origin ticket and enforces declared photo/video limits', async () => {
  expect(
    (
      await request(fixture.app)
        .post('/api/workspace/media/ticket')
        .set('Origin', testOrigin)
        .send({})
    ).status,
  ).toBe(401);
  expect(
    (
      await fixture.agent
        .post('/api/workspace/media/ticket')
        .set('Origin', 'https://evil.example')
        .send({})
    ).status,
  ).toBe(403);
  expect(
    (
      await fixture.agent
        .post('/api/workspace/media/ticket')
        .set('Origin', testOrigin)
        .send({ mimeType: 'image/jpeg', sizeBytes: 9 * 1024 * 1024 })
    ).status,
  ).toBe(422);
});
it('claims a scoped ticket once, validates the actual photo, and persists a Cloudinary identifier without disk storage', async () => {
  const authorization = await ticket(fixture.photo);
  expect(
    (await send(authorization, fixture.photo, 'image/jpeg', 'https://evil.example')).status,
  ).toBe(403);
  expect(
    (await send({ ...authorization, token: authorization.token + 'changed' }, fixture.photo))
      .status,
  ).toBe(403);
  expect((await send(authorization, fixture.photo, 'video/mp4')).status).toBe(409);
  const results = await Promise.all([
    send(authorization, fixture.photo),
    send(authorization, fixture.photo),
  ]);
  expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
  photoId = authorization.id;
  expect(await fixture.db.mediaAsset.findUniqueOrThrow({ where: { id: photoId } })).toMatchObject({
    userId: fixture.userId,
    status: 'READY',
    mimeType: 'image/jpeg',
    storageKey: `cloudinary:fixture-scheduler/${photoId}.jpg`,
  });
  expect(uploaded[0]?.bytes.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  await expect(access(legacyPath)).rejects.toMatchObject({ code: 'ENOENT' });
});
it('redirects owned previews to expiring protected Cloudinary downloads and rejects foreign previews', async () => {
  const preview = await fixture.agent.get(`/api/workspace/media/${photoId}`);
  expect(preview.status).toBe(307);
  expect(preview.headers['cache-control']).toBe('no-store');
  const url = new URL(String(preview.headers.location));
  expect(url.pathname).toBe('/v1_1/fixture-cloud/image/download');
  expect(url.searchParams.get('type')).toBe('authenticated');
  expect(url.searchParams.has('signature')).toBe(true);
  const other = await createWorkspaceFixture({ accountId: 'foreign-cloudinary' });
  try {
    expect((await other.agent.get(`/api/workspace/media/${photoId}`)).status).toBe(404);
  } finally {
    await other.close();
  }
});
it('rejects mismatched/corrupt bytes and records a failed reservation that cannot be replayed', async () => {
  const authorization = await ticket(Buffer.from('not-an-image'));
  expect((await send(authorization, Buffer.from('not-an-image'))).status).toBe(422);
  expect((await send(authorization, fixture.photo)).status).toBe(409);
  expect(
    (await fixture.db.mediaAsset.findUniqueOrThrow({ where: { id: authorization.id } })).status,
  ).toBe('FAILED');
  const wrongSize = await ticket(fixture.photo);
  expect((await send(wrongSize, fixture.photo.subarray(0, 20))).status).toBe(422);
  const expired = await ticket(fixture.photo);
  await fixture.db.mediaAsset.update({
    where: { id: expired.id },
    data: { createdAt: new Date(0) },
  });
  expect((await send(expired, fixture.photo)).status).toBe(409);
});
it('exposes safe Cloudinary failures and removes uploaded assets if database persistence fails', async () => {
  failure = true;
  const unavailable = await ticket(fixture.photo);
  const response = await send(unavailable, fixture.photo);
  failure = false;
  expect(response.status).toBe(503);
  expect(JSON.stringify(response.body)).not.toContain('secret-provider-body');
  expect(
    (await fixture.db.mediaAsset.findUniqueOrThrow({ where: { id: unavailable.id } })).status,
  ).toBe('FAILED');
  const persistence = await ticket(fixture.photo);
  const update = vi
    .spyOn(fixture.db.mediaAsset, 'update')
    .mockRejectedValueOnce(new Error('Simulated persistence failure'));
  const failed = await send(persistence, fixture.photo);
  update.mockRestore();
  expect(failed.status).toBe(500);
  expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
    `fixture-scheduler/${persistence.id}`,
    expect.objectContaining({ type: 'authenticated' }),
  );
});
it('prepares an actual MP4 and passes fresh Cloudinary photo/video URLs into the unchanged publishing safeguards', async () => {
  const video = await fixtureVideo();
  const authorization = await ticket(video, 'video/mp4');
  expect((await send(authorization, video, 'video/mp4')).status).toBe(201);
  const processor = createPublicationProcessor({
    db: fixture.db,
    client: fixture.client,
    tokens: fixture.tokens,
    storage,
  });
  for (const id of [photoId, authorization.id]) {
    fixture.state.containerStatus = 'FINISHED';
    const post = await new PostsService(fixture.db, storage).save(fixture.userId, {
      caption: 'Cloudinary publishing fixture',
      mediaAssetId: id,
      socialAccountId: fixture.channel.id,
      scheduledAt: new Date(Date.now() + 120000).toISOString(),
      timezone: 'UTC',
    });
    await fixture.db.publication.update({
      where: { id: post.publicationId },
      data: { scheduledAt: new Date(0) },
    });
    await Promise.all([processor(post.publicationId), processor(post.publicationId)]);
    expect(
      (await fixture.db.publication.findUniqueOrThrow({ where: { id: post.publicationId } }))
        .status,
    ).toBe('PUBLISHED');
  }
  const containers = fixture.fetcher.mock.calls.filter(([url]) =>
    new URL(String(url)).pathname.endsWith('/media'),
  );
  for (const [, init] of containers) {
    const parameters = new URLSearchParams(String(init?.body));
    const url = new URL(parameters.get('video_url') ?? parameters.get('image_url')!);
    expect(url.hostname).toBe('api.cloudinary.com');
    expect(url.searchParams.get('type')).toBe('authenticated');
  }
  expect(fixture.state.publishCalls).toBe(2);
});
