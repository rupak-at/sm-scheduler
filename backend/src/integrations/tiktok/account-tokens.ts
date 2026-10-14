import type { PrismaClient } from '../../database/index.js';
import type { TokenVault } from '../instagram/token-crypto.js';
import type { TikTokClient } from './client.js';
import { bundleSchema, TIKTOK_SCOPES } from './schemas.js';
import { tokenData } from './accounts.js';
import { TikTokError } from './http.js';

export class TikTokAccountTokens {
  constructor(
    private readonly db: PrismaClient,
    private readonly client: TikTokClient,
    private readonly vault: TokenVault,
  ) {}
  async validToken(id: string): Promise<string> {
    // Row locking serializes rotating refresh tokens across API/worker processes.
    // Return refresh failures instead of throwing inside the transaction so expiry/revocation commits.
    const result = await this.currentToken(id);
    if ('error' in result) throw result.error;
    const guard = {
      id,
      status: 'CONNECTED' as const,
      tokenCiphertext: { equals: result.account.tokenCiphertext! },
    };
    try {
      await this.client.profile(result.token, result.account.providerAccountId);
      const changed = await this.db.socialAccount.updateMany({
        where: guard,
        data: { tokenCheckedAt: new Date() },
      });
      if (changed.count !== 1) throw new TikTokError('CONNECTION_CHANGED');
      return result.token;
    } catch (error) {
      if (
        error instanceof TikTokError &&
        ['TOKEN_REVOKED', 'PERMISSION_REQUIRED', 'ACCOUNT_MISMATCH'].includes(error.code)
      )
        await this.db.socialAccount.updateMany({
          where: guard,
          data: { status: 'REVOKED', tokenCiphertext: null },
        });
      throw error;
    }
  }
  private currentToken(id: string) {
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "SocialAccount" WHERE id = ${id}::uuid FOR UPDATE`;
        let account = await tx.socialAccount.findUniqueOrThrow({ where: { id } });
        if (
          account.provider !== 'TIKTOK' ||
          account.status !== 'CONNECTED' ||
          !account.tokenCiphertext ||
          !account.tokenExpiresAt
        )
          return { error: new TikTokError('RECONNECT_REQUIRED') };
        let bundle = bundleSchema.parse(
          JSON.parse(
            this.vault.open(
              account.tokenCiphertext,
              account.providerAccountId,
              account.tokenKeyVersion,
            ),
          ),
        );
        if (!TIKTOK_SCOPES.every((scope) => bundle.scopes.includes(scope)))
          return { error: new TikTokError('PERMISSION_REQUIRED') };
        if (account.tokenExpiresAt.getTime() <= Date.now() + 300000) {
          if (new Date(bundle.refreshExpiresAt).getTime() <= Date.now()) {
            await tx.socialAccount.update({ where: { id }, data: { status: 'EXPIRED' } });
            return { error: new TikTokError('TOKEN_EXPIRED') };
          }
          try {
            const refreshed = await this.client.refresh(
              bundle.refreshToken,
              account.providerAccountId,
            );
            account = await tx.socialAccount.update({
              where: { id },
              data: tokenData(this.vault, refreshed),
            });
            bundle = bundleSchema.parse(
              JSON.parse(this.vault.open(account.tokenCiphertext!, account.providerAccountId)),
            );
          } catch (error) {
            if (
              error instanceof TikTokError &&
              (error.uncertain ||
                ['TOKEN_REVOKED', 'PERMISSION_REQUIRED', 'ACCOUNT_MISMATCH'].includes(error.code))
            )
              await tx.socialAccount.update({
                where: { id },
                data: { status: 'REVOKED', tokenCiphertext: null },
              });
            return { error };
          }
        }
        return { account, token: bundle.accessToken };
      },
      { timeout: 25000, maxWait: 25000 },
    );
  }
  async maintain(): Promise<void> {
    const accounts = await this.db.socialAccount.findMany({
      where: {
        provider: 'TIKTOK',
        status: 'CONNECTED',
        OR: [
          { tokenExpiresAt: { lt: new Date(Date.now() + 3600000) } },
          { tokenCheckedAt: null },
          { tokenCheckedAt: { lt: new Date(Date.now() - 6 * 3600000) } },
        ],
      },
      select: { id: true },
      take: 100,
    });
    for (const account of accounts) {
      try {
        await this.validToken(account.id);
      } catch (error) {
        if (!(error instanceof TikTokError)) throw error;
      }
    }
    await this.db.oAuthAttempt.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}
