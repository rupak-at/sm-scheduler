import type { PrismaClient } from '../../database/index.js';
import type { TokenVault } from '../instagram/token-crypto.js';
import type { TikTokClient } from './client.js';
import type { TikTokToken } from './schemas.js';
import { TikTokError } from './http.js';

export function tokenData(vault: TokenVault, token: TikTokToken) {
  const scopes = token.scope
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
  return {
    tokenCiphertext: vault.seal(
      JSON.stringify({
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        refreshExpiresAt: new Date(Date.now() + token.refresh_expires_in * 1000).toISOString(),
        scopes,
      }),
      token.open_id,
    ),
    tokenKeyVersion: 1,
    tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
    tokenRefreshedAt: new Date(),
    tokenCheckedAt: new Date(),
    scopes,
  };
}
export async function saveTikTokAccount(
  db: PrismaClient,
  vault: TokenVault,
  authorization: Awaited<ReturnType<TikTokClient['exchange']>>,
  userId: string,
): Promise<void> {
  await db.$transaction(
    async (tx) => {
      const where = {
        provider_providerAccountId: {
          provider: 'TIKTOK' as const,
          providerAccountId: authorization.token.open_id,
        },
      };
      const existing = await tx.socialAccount.findUnique({ where });
      if (existing && existing.userId !== userId) throw new TikTokError('ACCOUNT_ALREADY_LINKED');
      const data = {
        ...tokenData(vault, authorization.token),
        status: 'CONNECTED' as const,
        displayName: authorization.profile.display_name,
      };
      await tx.socialAccount.upsert({
        where,
        create: {
          userId,
          provider: 'TIKTOK',
          providerAccountId: authorization.token.open_id,
          ...data,
        },
        update: data,
      });
    },
    { isolationLevel: 'Serializable' },
  );
}
