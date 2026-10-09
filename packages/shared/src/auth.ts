import { z } from 'zod';

export const authenticatedUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
});
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
export const sessionResponseSchema = z.object({ user: authenticatedUserSchema }).nullable();
