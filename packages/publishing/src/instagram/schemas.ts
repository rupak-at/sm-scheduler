import { z } from 'zod';

export const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
});
const shortTokenItem = z.object({
  access_token: z.string().min(1),
  user_id: z.union([z.string(), z.number()]),
  // Instagram Login returns the grants with the code exchange. They are provider
  // evidence, unlike the scopes we requested in the authorization URL.
  permissions: z
    .union([z.string(), z.array(z.string())])
    .transform((value) => [
      ...new Set(
        (typeof value === 'string' ? value.split(/[\s,]+/) : value)
          .map((permission) => permission.trim())
          .filter(Boolean),
      ),
    ]),
});
export const shortTokenSchema = z
  .union([shortTokenItem, z.object({ data: z.tuple([shortTokenItem]) })])
  .transform((value) => ('data' in value ? value.data[0] : value));
export const profileSchema = z.object({
  id: z.string(),
  user_id: z.string().optional(),
  username: z.string(),
  account_type: z.enum(['BUSINESS', 'MEDIA_CREATOR']),
});
export const publishingLimitSchema = z.object({
  data: z.array(z.object({ quota_usage: z.number().int().nonnegative() })).min(1),
});
export const idSchema = z.object({ id: z.string() });
