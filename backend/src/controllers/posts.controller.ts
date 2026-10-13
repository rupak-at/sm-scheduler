import type { RequestHandler } from 'express';
import { z } from 'zod';
import { postInputSchema } from '@social-scheduler/shared';
import type { PostsService } from '../services/posts.service.js';

const updatePostSchema = postInputSchema.extend({ revision: z.iso.datetime() });

export function createPostsController(posts: PostsService) {
  return {
    create: async (request, response) => {
      const input = postInputSchema.parse(request.body);
      response.status(201).json(await posts.save(response.locals.userId, input));
    },
    update: async (request, response) => {
      const input = updatePostSchema.parse(request.body);
      const id = z.uuid().parse(request.params.id);
      response.json(await posts.save(response.locals.userId, input, id, input.revision));
    },
    cancel: async (request, response) => {
      await posts.cancel(response.locals.userId, z.uuid().parse(request.params.id));
      response.json({ success: true });
    },
    retry: async (request, response) => {
      await posts.retry(response.locals.userId, z.uuid().parse(request.params.id));
      response.json({ success: true });
    },
    remove: async (request, response) => {
      await posts.remove(response.locals.userId, z.uuid().parse(request.params.id));
      response.json({ success: true });
    },
  } satisfies Record<string, RequestHandler>;
}
