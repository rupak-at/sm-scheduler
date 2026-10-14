import type { PrismaClient } from '../../database/index.js';
import type { TokenVault } from '../instagram/token-crypto.js';
import type { FacebookPageAuthorization } from './schemas.js';
import { FacebookError } from './http.js';

export async function saveFacebookPages(
  db: PrismaClient,
  vault: TokenVault,
  pages: FacebookPageAuthorization[],
  userId: string,
): Promise<void> {
  await db.$transaction(
    async (tx) => {
      for (const page of pages) {
        const where = {
          provider_providerAccountId: { provider: 'FACEBOOK' as const, providerAccountId: page.id },
        };
        const existing = await tx.socialAccount.findUnique({ where });
        if (existing && existing.userId !== userId)
          throw new FacebookError('ACCOUNT_ALREADY_LINKED');
        const data = {
          displayName: page.name,
          status: 'CONNECTED' as const,
          tokenCiphertext: vault.seal(page.token, page.id),
          tokenKeyVersion: 1,
          tokenExpiresAt: page.expiresAt,
          tokenRefreshedAt: new Date(),
          tokenCheckedAt: new Date(),
          scopes: page.scopes,
          providerMetadata: { tasks: page.tasks },
        };
        await tx.socialAccount.upsert({
          where,
          create: { userId, provider: 'FACEBOOK', providerAccountId: page.id, ...data },
          update: data,
        });
      }
    },
    { isolationLevel: 'Serializable' },
  );
}
