import { z } from 'zod';

const optional = (schema: z.ZodType<string>) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
export const tiktokEnvironmentSchema = z.object({
  TIKTOK_CLIENT_KEY: optional(z.string().min(5)),
  TIKTOK_CLIENT_SECRET: optional(z.string().min(16)),
  TIKTOK_REDIRECT_URI: optional(z.url().refine((value) => value.startsWith('https://'))),
  TIKTOK_MEDIA_ORIGIN: optional(z.url().refine((value) => /^https:\/\/[^/@?#]+\/?$/.test(value))),
  TIKTOK_DIRECT_POST_AUDITED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});
export type TikTokEnvironment = z.infer<typeof tiktokEnvironmentSchema> & {
  TOKEN_ENCRYPTION_KEY?: string | undefined;
};
export function tiktokCredentials(env: TikTokEnvironment) {
  if (
    !env.TIKTOK_CLIENT_KEY ||
    !env.TIKTOK_CLIENT_SECRET ||
    !env.TIKTOK_REDIRECT_URI ||
    !env.TIKTOK_MEDIA_ORIGIN ||
    !env.TOKEN_ENCRYPTION_KEY
  )
    return null;
  return {
    clientKey: env.TIKTOK_CLIENT_KEY,
    clientSecret: env.TIKTOK_CLIENT_SECRET,
    redirectUri: env.TIKTOK_REDIRECT_URI,
    mediaOrigin: env.TIKTOK_MEDIA_ORIGIN,
    encryptionKey: env.TOKEN_ENCRYPTION_KEY,
    audited: env.TIKTOK_DIRECT_POST_AUDITED,
  };
}
