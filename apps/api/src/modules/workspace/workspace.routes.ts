import { Router } from 'express';
import { z } from 'zod';
import { postInputSchema } from '@social-scheduler/shared';
import type { AuthGateway } from '../auth/auth.types.js';
import { workspaceAuthorization } from './authorization.js';
import type { WorkspaceServices } from './workspace.types.js';
import { mediaRouter } from './media.routes.js';
import { postInclude, postView } from './post-view.js';
import { PostsService } from './posts.service.js';
import { channelsRouter } from './channels.routes.js';

export function workspaceRouter(services: WorkspaceServices, auth: AuthGateway, origin: string) {
  const router = Router();
  const { database } = services;
  const posts = new PostsService(database, services.storage, services.instagramConfigured);
  router.use(workspaceAuthorization(auth, database, origin));
  router.use(mediaRouter(services));
  router.get('/', async (request, response) => {
    const userId: string = response.locals.userId;
    const cursor = z.uuid().optional().parse(request.query.cursor);
    const view = z
      .enum(['all', 'drafts', 'scheduled', 'published', 'attention'])
      .default('all')
      .parse(request.query.view);
    const statuses = {
      drafts: ['DRAFT', 'CANCELLED'],
      scheduled: ['SCHEDULED', 'PROCESSING'],
      published: ['PUBLISHED'],
      attention: ['FAILED', 'UNCERTAIN'],
    } as const;
    const filter =
      view === 'all' ? {} : { publications: { some: { status: { in: [...statuses[view]] } } } };
    const [channels, items] = await Promise.all([
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
        where: { userId, ...filter },
        include: postInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 31,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
    ]);
    response.set('Cache-Control', 'no-store').json({
      instagramConfigured: services.instagramConfigured,
      channels,
      posts: items.slice(0, 30).map(postView),
      nextCursor: items.length > 30 ? items[29]?.id : null,
    });
  });
  router.post('/posts', async (request, response) => {
    response
      .status(201)
      .json(await posts.save(response.locals.userId, postInputSchema.parse(request.body)));
  });
  router.put('/posts/:id', async (request, response) => {
    const input = postInputSchema.extend({ revision: z.iso.datetime() }).parse(request.body);
    response.json(
      await posts.save(
        response.locals.userId,
        input,
        z.uuid().parse(request.params.id),
        input.revision,
      ),
    );
  });
  router.post('/posts/:id/cancel', async (request, response) => {
    await posts.cancel(response.locals.userId, z.uuid().parse(request.params.id));
    response.json({ success: true });
  });
  router.post('/posts/:id/retry', async (request, response) => {
    await posts.retry(response.locals.userId, z.uuid().parse(request.params.id));
    response.json({ success: true });
  });
  router.delete('/posts/:id', async (request, response) => {
    await posts.remove(response.locals.userId, z.uuid().parse(request.params.id));
    response.json({ success: true });
  });
  router.use(channelsRouter(services));
  return router;
}
