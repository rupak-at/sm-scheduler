import { cloudinaryEnvironmentSchema } from './cloudinary.js';
import { loadEnvironment } from './load-env.js';
import { instagramEnvironmentSchema, instagramConfigured } from './instagram.js';
import { facebookEnvironmentSchema, facebookCredentials } from './facebook.js';
import { tiktokEnvironmentSchema, tiktokCredentials } from './tiktok.js';
import { youtubeEnvironmentSchema, youtubeCredentials } from './youtube.js';
import { z } from 'zod';

const baseSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z.url().refine((value) => /^postgres(ql)?:/.test(value), 'Use a PostgreSQL URL'),
    REDIS_URL: z.url().refine((value) => /^rediss?:/.test(value), 'Use a Redis URL'),
  })
  .extend(cloudinaryEnvironmentSchema.shape);

const apiSchema = baseSchema
  .extend(instagramEnvironmentSchema.shape)
  .extend(facebookEnvironmentSchema.shape)
  .extend(tiktokEnvironmentSchema.shape)
  .extend(youtubeEnvironmentSchema.shape)
  .extend({
    BETTER_AUTH_SECRET: z.string().min(32),
    API_PUBLIC_URL: z
      .url()
      .refine(
        (value) => /^https?:\/\/[^/@?#]+\/?$/.test(value),
        'Use an HTTP(S) origin without credentials or a path',
      )
      .default('http://localhost:4000'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    WEB_ORIGIN: z.url().refine((value) => /^https?:/.test(value), 'Use an HTTP(S) origin'),
  })
  .refine((input) => input.NODE_ENV !== 'production' || input.WEB_ORIGIN.startsWith('https://'), {
    path: ['WEB_ORIGIN'],
    message: 'Production frontend origin requires HTTPS',
  })
  .refine(
    (input) => input.NODE_ENV !== 'production' || input.API_PUBLIC_URL.startsWith('https://'),
    { path: ['API_PUBLIC_URL'], message: 'Production upload API requires HTTPS' },
  );
const validatedApiSchema = apiSchema
  .refine(
    (input) =>
      !instagramConfigured(input) ||
      input.INSTAGRAM_REDIRECT_URI === `${input.WEB_ORIGIN}/api/auth/instagram/callback`,
    { path: ['INSTAGRAM_REDIRECT_URI'], message: 'Callback must use the web origin' },
  )
  .refine(
    (input) =>
      !facebookCredentials(input) ||
      input.FACEBOOK_REDIRECT_URI === `${input.WEB_ORIGIN}/api/auth/facebook/callback`,
    { path: ['FACEBOOK_REDIRECT_URI'], message: 'Callback must use the web origin' },
  )
  .refine(
    (input) =>
      !tiktokCredentials(input) ||
      input.TIKTOK_REDIRECT_URI === `${input.WEB_ORIGIN}/api/auth/tiktok/callback`,
    { path: ['TIKTOK_REDIRECT_URI'], message: 'Callback must use the web origin' },
  )
  .refine(
    (input) =>
      !youtubeCredentials(input) ||
      input.YOUTUBE_REDIRECT_URI === `${input.WEB_ORIGIN}/api/auth/youtube/callback`,
    { path: ['YOUTUBE_REDIRECT_URI'], message: 'Callback must use the web origin' },
  );
const workerSchema = baseSchema
  .extend(instagramEnvironmentSchema.shape)
  .extend(facebookEnvironmentSchema.shape)
  .extend(tiktokEnvironmentSchema.shape)
  .extend(youtubeEnvironmentSchema.shape)
  .extend({
    WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(2),
  });

function parseEnvironment<T>(schema: z.ZodType<T>, input: NodeJS.ProcessEnv): T {
  const result = schema.safeParse(input);
  if (result.success) {
    const values =
      input.CLOUDINARY_CLOUD_NAME || input.CLOUDINARY_API_KEY || input.CLOUDINARY_API_SECRET;
    if (
      values &&
      !(input.CLOUDINARY_CLOUD_NAME && input.CLOUDINARY_API_KEY && input.CLOUDINARY_API_SECRET)
    )
      throw new Error(
        'Invalid environment configuration: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
      );
    return result.data;
  }
  // Do not include input values or URL credentials in configuration errors.
  const fields = result.error.issues.map((issue) => issue.path.join('.'));
  throw new Error(`Invalid environment configuration: ${[...new Set(fields)].join(', ')}`);
}

export const parseApiEnvironment = (input: NodeJS.ProcessEnv) =>
  parseEnvironment(validatedApiSchema, input);
export const parseWorkerEnvironment = (input: NodeJS.ProcessEnv) =>
  parseEnvironment(workerSchema, input);

export type ApiEnvironment = ReturnType<typeof parseApiEnvironment>;
export type WorkerEnvironment = ReturnType<typeof parseWorkerEnvironment>;

export function getApiEnvironment(): ApiEnvironment {
  loadEnvironment();
  return parseApiEnvironment(process.env);
}

export function getWorkerEnvironment(): WorkerEnvironment {
  loadEnvironment();
  return parseWorkerEnvironment(process.env);
}
