import { createHmac, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createDatabase } from '../../backend/src/database/index.js';
import { createApp } from '../../backend/src/app.js';
import { createAuthentication } from '../../backend/src/services/auth.service.js';
import { LocalMediaStorage } from '../../backend/src/lib/media/local-storage.js';
import { deleteTestUsers } from '../integration/fixtures/database.js';
import { TokenVault } from '../../backend/src/integrations/instagram/token-crypto.js';
import { createLoadTikTok, tiktokLoadAccount } from './tiktok-provider.js';
import { createLoadYouTube, youtubeLoadAccount } from './youtube-provider.js';
import { fixtureVideo } from '../integration/fixtures/video.js';
export type LoadProvider = 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE';

export const origin = 'http://localhost:3000';
const secret = 'load-test-only-secret-never-use-in-production';
export interface LoadUser {
  id: string;
  channelId: string;
  mediaId: string;
  cookie: string;
}

function isolatedUrl() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? '');
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !url.pathname.endsWith('_load_test'))
    throw new Error('Load tests require a loopback TEST_DATABASE_URL ending in _load_test');
  return url.toString();
}

export async function createLoadFixture(
  count: number,
  webOrigin = origin,
  provider: LoadProvider = 'INSTAGRAM',
) {
  const db = createDatabase(isolatedUrl());
  const directory = await mkdtemp('/tmp/scheduler-load-');
  const storage = new LocalMediaStorage(directory, secret, 'https://fixture.example');
  const users = await seedUsers(db, count, provider, storage);
  const tiktok = provider === 'TIKTOK' ? createLoadTikTok(db, webOrigin) : undefined;
  const youtube = provider === 'YOUTUBE' ? createLoadYouTube(db, webOrigin) : undefined;
  const common = { database: db, secret, webOrigin, production: false };
  const auth = createAuthentication({
    ...common,
    ...(tiktok ? { tiktok: { ...common, client: tiktok.client, vault: tiktok.vault } } : {}),
    ...(youtube ? { youtube: { ...common, client: youtube.client, vault: youtube.vault } } : {}),
  });
  const uploads = { signingKey: secret, apiOrigin: origin, webOrigin };
  const server = createServer(
    createApp({
      webOrigin,
      auth,
      workspace: {
        database: db,
        storage,
        instagramConfigured: true,
        uploads,
        ...(tiktok ? { tiktok } : {}),
        ...(youtube ? { youtube } : {}),
      },
      checks: { database: () => db.$queryRaw`SELECT 1`, redis: async () => {} },
    }),
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  uploads.apiOrigin = base;
  return {
    db,
    users,
    base,
    storage,
    tiktok,
    youtube,
    close: async () => {
      server.closeIdleConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await db.rateLimit.deleteMany({
        where: { key: { in: users.map((user) => `workspace:${user.id}`) } },
      });
      await deleteTestUsers(
        db,
        users.map((user) => user.id),
      );
      await db.$disconnect();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

async function seedUsers(
  db: ReturnType<typeof createDatabase>,
  count: number,
  provider: LoadProvider,
  storage: LocalMediaStorage,
): Promise<LoadUser[]> {
  const run = randomUUID();
  const vault = new TokenVault(Buffer.alloc(32, 7).toString('base64'));
  const sessions = Array.from({ length: count }, () => ({ id: randomUUID(), token: randomUUID() }));
  const users = sessions.map(({ id, token }) => ({
    id,
    channelId: randomUUID(),
    mediaId: randomUUID(),
    cookie: `better-auth.session_token=${encodeURIComponent(`${token}.${createHmac('sha256', secret).update(token).digest('base64')}`)}`,
  }));
  await db.user.createMany({
    data: users.map(({ id }, i) => ({
      id,
      name: `Load ${i}`,
      email: `${run}-${i}@example.invalid`,
    })),
  });
  await db.session.createMany({
    data: sessions.map(({ id, token }) => ({
      userId: id,
      token,
      expiresAt: new Date(Date.now() + 3600000),
    })),
  });
  await db.socialAccount.createMany({
    data: users.map(({ id, channelId }) => ({
      id: channelId,
      userId: id,
      provider,
      providerAccountId: `${run}-${id}`,
      status: 'CONNECTED',
      tokenCiphertext: vault.seal(`${run}-${id}`, `${run}-${id}`),
      tokenExpiresAt: new Date(Date.now() + 86400000),
      ...(provider === 'TIKTOK' ? tiktokLoadAccount(`${run}-${id}`) : {}),
      ...(provider === 'YOUTUBE' ? youtubeLoadAccount(`${run}-${id}`) : {}),
    })),
  });
  const video = provider === 'YOUTUBE' && count ? await fixtureVideo() : undefined;
  if (video) {
    // Queue load uses one real fixture video copied to independent owned assets;
    // concurrent transcoding is separately bounded and is not this workload.
    await Promise.all(users.map((user) => storage.put(user.mediaId, video, 'mp4')));
  }
  await db.mediaAsset.createMany({
    data: users.map(({ id, mediaId }) => ({
      id: mediaId,
      userId: id,
      storageKey: `load:${mediaId}`,
      mimeType: video ? 'video/mp4' : 'image/jpeg',
      type: video ? 'VIDEO' : 'IMAGE',
      status: 'READY',
      sizeBytes: video?.length ?? 100,
      ...(video ? { width: 320, height: 568, durationSeconds: 3 } : {}),
    })),
  });
  return users;
}
