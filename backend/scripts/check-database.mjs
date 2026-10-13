import { lookup } from 'node:dns/promises';
import process from 'node:process';
import { readdir } from 'node:fs/promises';
import { URL } from 'node:url';
import { loadEnvironment } from '../dist/config/load-env.js';
import { createDatabase } from '../dist/database/index.js';

loadEnvironment();
const write = (message) => process.stdout.write(`${message}\n`);

async function checkMigrations(database) {
  const tables = await database.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = current_schema()
  `;
  if (!tables.some((table) => table.tablename === '_prisma_migrations')) {
    throw new Error('MIGRATIONS_MISSING');
  }
  const migrations = await database.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"
  `;
  if (migrations.some((migration) => !migration.finished_at && !migration.rolled_back_at)) {
    throw new Error('MIGRATION_FAILED');
  }
  const entries = await readdir(new URL('../prisma/migrations/', import.meta.url), {
    withFileTypes: true,
  });
  const pending = entries
    .filter((entry) => entry.isDirectory())
    .filter(
      (entry) => !migrations.some((row) => row.migration_name === entry.name && row.finished_at),
    );
  if (pending.length) throw new Error('MIGRATIONS_MISSING');
  write('Committed migrations are applied. This checks history, not schema drift.');
}

async function explainFailure(error, connectionString) {
  // Never print raw adapter errors: they may contain connection credentials.
  if (error.message === 'MIGRATIONS_MISSING') {
    write('Database reachable, but migrations are pending. Run npm run db:deploy.');
    return;
  }
  if (error.message === 'MIGRATION_FAILED') {
    write(
      'A migration is unfinished. Inspect npm exec -w @social-scheduler/backend -- prisma migrate status.',
    );
    return;
  }
  write(
    'Database check failed. Check DATABASE_URL, credentials, network access, and database status.',
  );
  if (!connectionString) return;
  try {
    const hostname = new URL(connectionString).hostname;
    const addresses = await lookup(hostname, { all: true });
    if (addresses.length && addresses.every((address) => address.family === 6)) {
      write(
        'The database hostname resolves only to IPv6. Your machine needs working IPv6 connectivity.',
      );
      if (hostname.endsWith('.supabase.co')) {
        write(
          'For Supabase on an IPv4 network, use the Connect panel Session pooler URI (port 5432).',
        );
      }
    }
  } catch {
    write('Database hostname could not be resolved. Check the URL and DNS/network access.');
  }
}

let database;
try {
  if (!process.env.DATABASE_URL) throw new Error('CONFIGURATION_MISSING');
  database = createDatabase(process.env.DATABASE_URL);
  await database.$queryRaw`SELECT 1`;
  write('PostgreSQL connection is working.');
  await checkMigrations(database);
} catch (error) {
  process.exitCode = 1;
  await explainFailure(error, process.env.DATABASE_URL);
} finally {
  await database?.$disconnect();
}
