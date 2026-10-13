import type { PrismaClient, Prisma } from '../database/index.js';
import type { z } from 'zod';
import { postInclude, postView } from './post-view.js';
import type { WorkspaceCounts, workspaceSchema } from '@social-scheduler/shared';
import type { WorkspaceQuery } from '../validators/workspace.schemas.js';
const statuses = {
  drafts: ['DRAFT', 'CANCELLED'],
  scheduled: ['SCHEDULED', 'PROCESSING'],
  published: ['PUBLISHED'],
  attention: ['FAILED', 'UNCERTAIN'],
} as const;

function statusFilter(view: WorkspaceQuery['view']): Prisma.PostWhereInput {
  return view === 'all' ? {} : { publications: { some: { status: { in: [...statuses[view]] } } } };
}

export async function readWorkspace(
  database: PrismaClient,
  userId: string,
  query: WorkspaceQuery,
): Promise<Omit<z.infer<typeof workspaceSchema>, 'instagramConfigured'>> {
  const [channels, items, counts, upcoming] = await Promise.all([
    database.socialAccount.findMany({
      where: { userId, provider: 'INSTAGRAM' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        displayName: true,
        status: true,
        tokenExpiresAt: true,
        tokenCheckedAt: true,
      },
    }),
    database.post.findMany({
      where: { userId, ...statusFilter(query.view) },
      include: postInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 31,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    }),
    readCounts(database, userId),
    database.publication
      .findMany({
        where: {
          post: { userId },
          socialAccount: { userId },
          status: 'SCHEDULED',
          scheduledAt: { not: null },
        },
        select: { post: { include: postInclude } },
        orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
        take: 3,
      })
      .then((publications) => publications.map(({ post }) => postView(post))),
  ]);
  return {
    channels: channels.map((channel) => ({
      ...channel,
      tokenExpiresAt: channel.tokenExpiresAt?.toISOString() ?? null,
      tokenCheckedAt: channel.tokenCheckedAt?.toISOString() ?? null,
    })),
    posts: items.slice(0, 30).map(postView),
    nextCursor: items.length > 30 ? (items[29]?.id ?? null) : null,
    counts,
    upcoming,
  };
}

async function readCounts(database: PrismaClient, userId: string): Promise<WorkspaceCounts> {
  const count = (view: WorkspaceQuery['view']) =>
    database.post.count({ where: { userId, ...statusFilter(view) } });
  const [all, drafts, scheduled, published, attention] = await Promise.all([
    count('all'),
    count('drafts'),
    count('scheduled'),
    count('published'),
    count('attention'),
  ]);
  return { all, drafts, scheduled, published, attention };
}
