import type { PrismaClient } from '../../../database/index.js';
import { InstagramError } from '../http.js';
import type { InstagramClient } from '../client.js';
import type { TokenVault } from '../token-crypto.js';

export const INSTAGRAM_EMAIL_DOMAIN = 'instagram.users.invalid';
export async function saveInstagramIdentity(
  db: PrismaClient,
  vault: TokenVault,
  authorization: Awaited<ReturnType<InstagramClient['exchange']>>,
  linkUserId?: string,
) {
  const { profile, token, expiresAt, scopes } = authorization;
  return db.$transaction(
    async (tx) => {
      const identity = await tx.account.findUnique({
        where: {
          providerId_accountId: {
            providerId: 'instagram',
            accountId: profile.id,
          },
        },
        include: { user: true },
      });
      if (linkUserId && identity && identity.userId !== linkUserId)
        throw new InstagramError('ACCOUNT_ALREADY_LINKED');
      const user = linkUserId
        ? await tx.user.findUniqueOrThrow({ where: { id: linkUserId } })
        : (identity?.user ??
          (await tx.user.create({
            data: {
              name: profile.username,
              email: `${profile.id}@${INSTAGRAM_EMAIL_DOMAIN}`,
              emailVerified: false,
            },
          })));
      if (!identity)
        await tx.account.create({
          data: { userId: user.id, providerId: 'instagram', accountId: profile.id },
        });
      const existing = await tx.socialAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: 'INSTAGRAM',
            providerAccountId: profile.id,
          },
        },
      });
      if (existing && existing.userId !== user.id)
        throw new InstagramError('ACCOUNT_ALREADY_LINKED');
      const data = {
        displayName: profile.username,
        status: 'CONNECTED' as const,
        tokenCiphertext: vault.seal(token, profile.id),
        tokenKeyVersion: 1,
        tokenExpiresAt: expiresAt,
        tokenRefreshedAt: new Date(),
        tokenCheckedAt: new Date(),
        scopes,
      };
      await tx.socialAccount.upsert({
        where: {
          provider_providerAccountId: {
            provider: 'INSTAGRAM',
            providerAccountId: profile.id,
          },
        },
        create: { userId: user.id, provider: 'INSTAGRAM', providerAccountId: profile.id, ...data },
        update: data,
      });
      return user;
    },
    { isolationLevel: 'Serializable' },
  );
}
