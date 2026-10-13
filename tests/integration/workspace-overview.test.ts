import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PlannerPost } from '@social-scheduler/shared';
import { workspaceSchema } from '@social-scheduler/shared';
import { createWorkspaceFixture } from './fixtures/workspace.js';
let owner: Awaited<ReturnType<typeof createWorkspaceFixture>>;
let other: Awaited<ReturnType<typeof createWorkspaceFixture>>;
const scheduledIds: string[] = [];
beforeAll(async () => {
  owner = await createWorkspaceFixture({ accountId: 'overview-owner' });
  other = await createWorkspaceFixture({ accountId: 'overview-other' });
  const asset = await owner.db.mediaAsset.create({
    data: {
      userId: owner.userId,
      storageKey: 'overview-test-photo',
      mimeType: 'image/jpeg',
      type: 'IMAGE',
      status: 'READY',
      sizeBytes: 100,
    },
  });
  async function create(status: PlannerPost['status'], delay = 0) {
    return owner.db.post.create({
      data: {
        userId: owner.userId,
        caption: `Overview ${status}`,
        media: { create: { mediaAssetId: asset.id, position: 0 } },
        publications: {
          create: {
            socialAccountId: owner.channel.id,
            status,
            scheduledAt: delay ? new Date(Date.now() + delay) : null,
            timezone: 'Asia/Kathmandu',
          },
        },
      },
    });
  }
  for (let i = 0; i < 32; i++) await create('DRAFT');
  for (const delay of [240000, 60000, 180000, 120000])
    scheduledIds.push((await create('SCHEDULED', delay)).id);
  for (const status of ['CANCELLED', 'PROCESSING', 'PUBLISHED', 'FAILED', 'UNCERTAIN'] as const)
    await create(status);
});
afterAll(async () => {
  await owner?.close();
  await other?.close();
});
describe('workspace-wide counts and bounded agenda', () => {
  it('keeps counts and chronological upcoming posts independent of filters and cursors', async () => {
    const first = await owner.agent.get('/api/workspace?view=drafts');
    expect(first.status).toBe(200);
    const data = workspaceSchema.parse(first.body);
    expect(data.counts).toEqual({ all: 41, drafts: 33, scheduled: 5, published: 1, attention: 2 });
    expect(data.posts).toHaveLength(30);
    expect(data.upcoming.map((post) => post.id)).toEqual([
      scheduledIds[1],
      scheduledIds[3],
      scheduledIds[2],
    ]);
    const second = await owner.agent.get(`/api/workspace?view=drafts&cursor=${data.nextCursor}`);
    expect(second.status).toBe(200);
    expect(second.body.posts).toHaveLength(3);
    expect(second.body.counts).toEqual(data.counts);
    expect(second.body.upcoming).toEqual(data.upcoming);
    const attention = await owner.agent.get('/api/workspace?view=attention');
    expect(attention.body.posts).toHaveLength(2);
    expect(attention.body.counts).toEqual(data.counts);
    expect(attention.body.upcoming).toEqual(data.upcoming);
    expect(JSON.stringify(first.body)).not.toMatch(/long-secret|tokenCiphertext|accessToken/);
  });
  it('does not expose another creator’s counts or upcoming posts', async () => {
    const response = await other.agent.get('/api/workspace');
    expect(response.status).toBe(200);
    const data = workspaceSchema.parse(response.body);
    expect(data.counts).toEqual({ all: 0, drafts: 0, scheduled: 0, published: 0, attention: 0 });
    expect(data.upcoming).toEqual([]);
    expect(data.posts).toEqual([]);
  });
});
