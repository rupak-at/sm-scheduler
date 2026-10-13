import { createDatabase } from '../../../backend/src/database/index.js';
import type { PrismaClient } from '../../../backend/src/database/index.js';
export function integrationDatabase(): PrismaClient {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error('Set TEST_DATABASE_URL to an isolated, migrated database');
  return createDatabase(process.env.TEST_DATABASE_URL);
}
export async function deleteTestUsers(db: PrismaClient, ids: string[]) {
  await db.publishAttempt.deleteMany({ where: { publication: { post: { userId: { in: ids } } } } });
  await db.publication.deleteMany({ where: { post: { userId: { in: ids } } } });
  await db.post.deleteMany({ where: { userId: { in: ids } } });
  await db.mediaAsset.deleteMany({ where: { userId: { in: ids } } });
  await db.socialAccount.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
}
