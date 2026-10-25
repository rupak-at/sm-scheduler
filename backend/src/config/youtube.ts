import { z } from 'zod';

const optional = (schema: z.ZodType<string>) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
export const youtubeEnvironmentSchema = z.object({
  YOUTUBE_CLIENT_ID: optional(z.string().min(5)),
  YOUTUBE_CLIENT_SECRET: optional(z.string().min(16)),
  YOUTUBE_REDIRECT_URI: optional(z.url().refine((value) => value.startsWith('https://'))),
});
export type YouTubeEnvironment = z.infer<typeof youtubeEnvironmentSchema> & {
  TOKEN_ENCRYPTION_KEY?: string | undefined;
};
export function youtubeCredentials(env: YouTubeEnvironment) {
  if (
    !env.YOUTUBE_CLIENT_ID ||
    !env.YOUTUBE_CLIENT_SECRET ||
    !env.YOUTUBE_REDIRECT_URI ||
    !env.TOKEN_ENCRYPTION_KEY
  )
    return null;
  return {
    clientId: env.YOUTUBE_CLIENT_ID,
    clientSecret: env.YOUTUBE_CLIENT_SECRET,
    redirectUri: env.YOUTUBE_REDIRECT_URI,
    encryptionKey: env.TOKEN_ENCRYPTION_KEY,
  };
}
