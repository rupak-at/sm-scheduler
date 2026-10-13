import { z } from 'zod';

const optionalValue = (schema: z.ZodType<string>) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
export const instagramEnvironmentSchema = z.object({
  INSTAGRAM_APP_ID: optionalValue(z.string().regex(/^\d+$/)),
  INSTAGRAM_APP_SECRET: optionalValue(z.string().min(16)),
  INSTAGRAM_GRAPH_VERSION: optionalValue(z.string().regex(/^v\d+\.\d+$/)),
  INSTAGRAM_REDIRECT_URI: optionalValue(z.url().refine((value) => value.startsWith('https://'))),
  TOKEN_ENCRYPTION_KEY: optionalValue(
    z
      .string()
      .refine(
        (value) =>
          /^[A-Za-z0-9+/]+={0,2}$/.test(value) && Buffer.from(value, 'base64').length === 32,
      ),
  ),
  MEDIA_PUBLIC_URL: optionalValue(z.url().refine((value) => value.startsWith('https://'))),
  MEDIA_STORAGE_PATH: z.string().default('.data/media'),
});
export type InstagramEnvironment = z.infer<typeof instagramEnvironmentSchema>;
export function instagramCredentials(env: InstagramEnvironment) {
  const {
    INSTAGRAM_APP_ID,
    INSTAGRAM_APP_SECRET,
    INSTAGRAM_GRAPH_VERSION,
    INSTAGRAM_REDIRECT_URI,
    TOKEN_ENCRYPTION_KEY,
  } = env;
  if (
    !INSTAGRAM_APP_ID ||
    !INSTAGRAM_APP_SECRET ||
    !INSTAGRAM_GRAPH_VERSION ||
    !INSTAGRAM_REDIRECT_URI ||
    !TOKEN_ENCRYPTION_KEY
  )
    return null;
  return {
    appId: INSTAGRAM_APP_ID,
    appSecret: INSTAGRAM_APP_SECRET,
    version: INSTAGRAM_GRAPH_VERSION,
    redirectUri: INSTAGRAM_REDIRECT_URI,
    encryptionKey: TOKEN_ENCRYPTION_KEY,
  };
}
export function instagramConfigured(env: InstagramEnvironment): boolean {
  return instagramCredentials(env) !== null;
}
