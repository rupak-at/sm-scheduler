import { z } from 'zod';

export const workspaceQuerySchema = z.object({
  cursor: z.uuid().optional(),
  view: z.enum(['all', 'drafts', 'scheduled', 'published', 'attention']).default('all'),
});
export type WorkspaceQuery = z.infer<typeof workspaceQuerySchema>;
