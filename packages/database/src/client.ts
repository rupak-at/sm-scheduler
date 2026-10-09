import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

// Call once per process and disconnect on shutdown. No connection side effects on import.
export function createDatabase(connectionString: string) {
  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 3000,
    query_timeout: 3000,
    max: 10,
  });
  return new PrismaClient({ adapter });
}
