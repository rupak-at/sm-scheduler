import type { PrismaClient } from '@social-scheduler/database';
import type { ClaimedPublication } from './claim.js';

export async function finishPublication(
  db: PrismaClient,
  record: ClaimedPublication,
  status: 'PUBLISHED' | 'FAILED' | 'UNCERTAIN',
  errorCode?: string,
  externalPostId?: string,
) {
  await db.$transaction(async (tx) => {
    const changed = await tx.publication.updateMany({
      where: { id: record.id, leaseToken: record.leaseToken, leaseExpiresAt: { gt: new Date() } },
      data: {
        status,
        leaseToken: null,
        leaseExpiresAt: status === 'UNCERTAIN' ? new Date(Date.now() + 300000) : null,
        ...(status === 'PUBLISHED'
          ? { publishedAt: new Date(), externalPostId: externalPostId ?? null }
          : {}),
      },
    });
    if (!changed.count) return;
    await tx.publishAttempt.update({
      where: { id: record.attemptId },
      data: {
        status: status === 'PUBLISHED' ? 'SUCCEEDED' : status,
        finishedAt: new Date(),
        errorCode: errorCode ?? null,
        externalPostId: externalPostId ?? null,
      },
    });
  });
}
export async function deferPublication(db: PrismaClient, record: ClaimedPublication) {
  await db.publication.updateMany({
    where: { id: record.id, leaseToken: record.leaseToken },
    data: { leaseToken: null, leaseExpiresAt: new Date(Date.now() + 30000) },
  });
}
