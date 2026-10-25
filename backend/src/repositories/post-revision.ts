import type { Prisma } from '../database/index.js';

// Status-only changes must invalidate editors too. Preserve strictly increasing
// millisecond revisions even when consecutive changes happen in the same tick.
export async function advancePostRevision(
  tx: Prisma.TransactionClient,
  id: string,
  userId: string,
) {
  await tx.$executeRaw`UPDATE "Post" SET "updatedAt" = GREATEST(clock_timestamp(), "updatedAt" + interval '1 millisecond') WHERE id = ${id}::uuid AND "userId" = ${userId}::uuid`;
}
