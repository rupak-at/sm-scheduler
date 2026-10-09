import { z } from 'zod';

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url().refine((value) => /^postgres(ql)?:/.test(value), 'Use a PostgreSQL URL'),
  REDIS_URL: z.url().refine((value) => /^rediss?:/.test(value), 'Use a Redis URL'),
});

const apiSchema = baseSchema
  .extend({
    BETTER_AUTH_SECRET: z.string().min(32),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    WEB_ORIGIN: z.url().refine((value) => /^https?:/.test(value), 'Use an HTTP(S) origin'),
  })
  .refine((input) => input.NODE_ENV !== 'production' || input.WEB_ORIGIN.startsWith('https://'), {
    path: ['WEB_ORIGIN'],
    message: 'Production authentication requires HTTPS',
  });
const workerSchema = baseSchema.extend({
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(2),
});

function parseEnvironment<T>(schema: z.ZodType<T>, input: NodeJS.ProcessEnv): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  // Do not include input values or URL credentials in configuration errors.
  const fields = result.error.issues.map((issue) => issue.path.join('.'));
  throw new Error(`Invalid environment configuration: ${[...new Set(fields)].join(', ')}`);
}

export const parseApiEnvironment = (input: NodeJS.ProcessEnv) => parseEnvironment(apiSchema, input);
export const parseWorkerEnvironment = (input: NodeJS.ProcessEnv) =>
  parseEnvironment(workerSchema, input);
