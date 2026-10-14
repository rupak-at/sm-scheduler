import { z } from 'zod';

export const FACEBOOK_SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];
export const id = z.string().regex(/^\d+$/);
export const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive().optional(),
});
export const pageSchema = z.object({
  id,
  name: z.string().min(1),
  access_token: z.string().min(1),
  tasks: z.array(z.string()),
});
export const pagesSchema = z.object({
  data: z.array(pageSchema),
  paging: z
    .object({
      next: z.string().optional(),
      cursors: z.object({ after: z.string().max(2048).optional() }).optional(),
    })
    .optional(),
});
export const debugSchema = z.object({
  data: z.object({
    app_id: id,
    is_valid: z.boolean(),
    type: z.string(),
    profile_id: id.optional(),
    user_id: id.optional(),
    expires_at: z.number().int().nonnegative(),
    data_access_expires_at: z.number().int().nonnegative(),
    scopes: z.array(z.string()),
    granular_scopes: z
      .array(z.object({ scope: z.string(), target_ids: z.array(id).optional() }))
      .optional(),
  }),
});
export type FacebookGrant = z.infer<typeof debugSchema>['data'];
export interface FacebookPageAuthorization {
  id: string;
  name: string;
  token: string;
  expiresAt: Date | null;
  scopes: string[];
  tasks: string[];
}
export const photoResultSchema = z.object({ id, post_id: z.string().regex(/^\d+_\d+$/) });
export const videoStatusSchema = z.object({
  id,
  published: z.boolean(),
  status: z.object({
    video_status: z.string(),
    publishing_phase: z.object({ status: z.string() }).optional(),
  }),
});
