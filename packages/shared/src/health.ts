import { z } from 'zod';

export const readinessSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  service: z.literal('api'),
  dependencies: z.object({
    database: z.enum(['up', 'down']),
    redis: z.enum(['up', 'down']),
  }),
});
export type Readiness = z.infer<typeof readinessSchema>;
