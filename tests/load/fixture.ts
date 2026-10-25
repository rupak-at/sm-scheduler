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

export async function createLoadFixture(count: number, webOrigin = origin) {
  const db = createDatabase(isolatedUrl());
  const directory = await mkdtemp('/tmp/scheduler-load-');
  const storage = new LocalMediaStorage(directory, secret, 'https://fixture.example');
  const users = await seedUsers(db, count);
  const auth = createAuthentication({ database: db, secret, webOrigin, production: false });
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
      provider: 'INSTAGRAM',
      providerAccountId: `${run}-${id}`,
      status: 'CONNECTED',
      tokenCiphertext: vault.seal(`${run}-${id}`, `${run}-${id}`),
      tokenExpiresAt: new Date(Date.now() + 86400000),
    })),
  });
  await db.mediaAsset.createMany({
    data: users.map(({ id, mediaId }) => ({
      id: mediaId,
      userId: id,
      storageKey: `load:${mediaId}`,
      mimeType: 'image/jpeg',
      type: 'IMAGE',
      status: 'READY',
      sizeBytes: 100,
    })),
  });
  return users;
}
