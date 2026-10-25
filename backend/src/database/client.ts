import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

// Call once per process and disconnect on shutdown. No connection side effects on import.
export function createDatabase(connectionString: string) {
  const adapter = new PrismaPg({
    connectionString,
    // Bound queueing separately from query execution so short traffic bursts can
    // drain through the fixed-size pool rather than fail while waiting for a slot.
    connectionTimeoutMillis: 10000,
    query_timeout: 3000,
    max: 10,
  });
  return new PrismaClient({ adapter, transactionOptions: { maxWait: 10000, timeout: 5000 } });
}
