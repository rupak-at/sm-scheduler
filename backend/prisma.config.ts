import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

export default defineConfig({
  schema: 'prisma',
  migrations: { path: 'prisma/migrations' },
  // Generate and validate work without a database; migration commands require DATABASE_URL.
  ...(process.env.DATABASE_URL ? { datasource: { url: process.env.DATABASE_URL } } : {}),
});
