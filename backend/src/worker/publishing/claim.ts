import { randomUUID } from 'node:crypto';
import type { PrismaClient, Prisma } from '../../database/index.js';

type StoredPublication = Prisma.PublicationGetPayload<{
  include: {
    post: { include: { media: { include: { mediaAsset: true } } } };
    socialAccount: true;
    attempts: true;
  };
}>;
export type ClaimedPublication = StoredPublication & { leaseToken: string; attemptId: string };
export async function claimPublication(
  db: PrismaClient,
  id: string,
): Promise<ClaimedPublication | null> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Publication" WHERE id = ${id}::uuid FOR UPDATE`;
    const record = await tx.publication.findUnique({
      where: { id },
      include: {
        post: {
          include: { media: { orderBy: { position: 'asc' }, include: { mediaAsset: true } } },
        },
        socialAccount: true,
        attempts: { orderBy: { attemptNumber: 'desc' }, take: 1 },
      },
    });
    if (!record || !['SCHEDULED', 'PROCESSING', 'UNCERTAIN'].includes(record.status)) return null;
    if (
      record.status === 'SCHEDULED' &&
      (!record.scheduledAt || record.scheduledAt.getTime() > Date.now())
    )
      return null;
    if (record.leaseExpiresAt && record.leaseExpiresAt.getTime() > Date.now()) return null;
    const leaseToken = randomUUID();
    await tx.publication.update({
      where: { id },
      data: {
        status: record.status === 'UNCERTAIN' ? 'UNCERTAIN' : 'PROCESSING',
        leaseToken,
        leaseExpiresAt: new Date(Date.now() + 180000),
      },
    });
    const attempt =
      record.status === 'SCHEDULED'
        ? await tx.publishAttempt.create({
            data: {
              publicationId: id,
              attemptNumber: (record.attempts[0]?.attemptNumber ?? 0) + 1,
            },
          })
        : record.attempts[0];
    if (!attempt) throw new Error('Publication attempt missing');
    return { ...record, leaseToken, attemptId: attempt.id };
  });
}
