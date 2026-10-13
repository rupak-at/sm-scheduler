import type { PrismaClient } from '../../database/index.js';
import type { Queue } from 'bullmq';
export async function reconcilePublications(db: PrismaClient, queue: Queue) {
  const records = await db.publication.findMany({
    where: {
      OR: [
        { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
        {
          status: { in: ['PROCESSING', 'UNCERTAIN'] },
          OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: new Date() } }],
        },
      ],
    },
    select: { id: true },
    take: 100,
    orderBy: { updatedAt: 'asc' },
  });
  for (const record of records)
    await queue.add(
      'publish',
      { publicationId: record.id },
      { jobId: record.id, removeOnComplete: true, removeOnFail: true },
    );
}
