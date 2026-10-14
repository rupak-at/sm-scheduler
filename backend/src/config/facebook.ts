import { z } from 'zod';

const optional = (schema: z.ZodType<string>) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
export const facebookEnvironmentSchema = z.object({
  FACEBOOK_APP_ID: optional(z.string().regex(/^\d+$/)),
  FACEBOOK_APP_SECRET: optional(z.string().min(16)),
  FACEBOOK_GRAPH_VERSION: optional(z.string().regex(/^v\d+\.\d+$/)),
  FACEBOOK_REDIRECT_URI: optional(z.url().refine((value) => value.startsWith('https://'))),
  FACEBOOK_LOGIN_CONFIG_ID: optional(z.string().regex(/^\d+$/)),
});
export type FacebookEnvironment = z.infer<typeof facebookEnvironmentSchema> & {
  TOKEN_ENCRYPTION_KEY?: string | undefined;
};
export function facebookCredentials(env: FacebookEnvironment) {
  if (
    !env.FACEBOOK_APP_ID ||
    !env.FACEBOOK_APP_SECRET ||
    !env.FACEBOOK_GRAPH_VERSION ||
    !env.FACEBOOK_REDIRECT_URI ||
    !env.TOKEN_ENCRYPTION_KEY
  )
    return null;
  return {
    appId: env.FACEBOOK_APP_ID,
    appSecret: env.FACEBOOK_APP_SECRET,
    version: env.FACEBOOK_GRAPH_VERSION,
    redirectUri: env.FACEBOOK_REDIRECT_URI,
    encryptionKey: env.TOKEN_ENCRYPTION_KEY,
    ...(env.FACEBOOK_LOGIN_CONFIG_ID ? { configId: env.FACEBOOK_LOGIN_CONFIG_ID } : {}),
  };
}
