import type { PrismaClient, SocialAccount } from '@social-scheduler/database';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import sharp from 'sharp';
import request from 'supertest';
import { AccountTokens, MediaStorage, TokenVault } from '@social-scheduler/publishing';
import { createApp } from '../../../apps/api/src/app.js';
import { createAuthentication } from '../../../apps/api/src/modules/auth/auth.service.js';
import { instagramFixture, testKey, testOrigin, testSecret } from './instagram.js';
import { integrationDatabase, deleteTestUsers } from './database.js';
interface WorkspaceFixture extends ReturnType<typeof instagramFixture> {
  db: PrismaClient;
  app: ReturnType<typeof createApp>;
  agent: ReturnType<typeof request.agent>;
  userId: string;
  channel: SocialAccount;
  photo: Buffer;
  storage: MediaStorage;
  tokens: AccountTokens;
  close: () => Promise<void>;
}
export async function createWorkspaceFixture(
  options: { accountId?: string } = {},
): Promise<WorkspaceFixture> {
  const db = integrationDatabase();
  await db.rateLimit.deleteMany();
  const directory = await mkdtemp('/tmp/social-scheduler-test-media-');
  const fixture = instagramFixture();
  if (options.accountId) fixture.state.accountId = options.accountId;
  const vault = new TokenVault(testKey);
  const storage = new MediaStorage(directory, testKey, 'https://test.example');
  const tokens = new AccountTokens(db, fixture.client, vault);
  const auth = createAuthentication({
    database: db,
    secret: testSecret,
    webOrigin: testOrigin,
    production: false,
  });
  const app = createApp({
    webOrigin: testOrigin,
    auth,
    workspace: { database: db, storage, tokens, instagramConfigured: true },
    checks: { database: async () => {}, redis: async () => {} },
  });
  const agent = request.agent(app);
  const signup = await agent
    .post('/api/auth/sign-up/email')
    .set('Origin', testOrigin)
    .send({
      name: 'Creator',
      email: `${randomUUID()}@example.com`,
      password: 'long-enough-passphrase',
    });
  if (signup.status !== 200) throw new Error(`Test signup failed: ${signup.status}`);
  const userId: string = signup.body.user.id;
  const channel = await db.socialAccount.create({
    data: {
      userId,
      provider: 'INSTAGRAM',
      providerAccountId: fixture.state.accountId,
      displayName: 'test_creator',
      status: 'CONNECTED',
      tokenCiphertext: vault.seal('long-secret', fixture.state.accountId),
      tokenExpiresAt: new Date(Date.now() + 60 * 86400000),
      tokenRefreshedAt: new Date(),
      tokenCheckedAt: new Date(),
    },
  });
  const photo = await sharp({
    create: { width: 800, height: 1000, channels: 3, background: '#ededed' },
  })
    .jpeg()
    .toBuffer();
  return {
    db,
    app,
    agent,
    userId,
    channel,
    photo,
    storage,
    tokens,
    ...fixture,
    close: async () => {
      await deleteTestUsers(db, [userId]);
      await db.$disconnect();
      await rm(directory, { recursive: true });
    },
  };
}
