import type { PrismaClient } from '../../database/index.js';
import type { TokenVault } from '../instagram/token-crypto.js';
import type { YouTubeClient } from './client.js';
import { bundleSchema, YOUTUBE_SCOPES } from './schemas.js';
import { youtubeTokenData } from './accounts.js';
import { YouTubeError } from './http.js';

export class YouTubeAccountTokens {
  constructor(
    private readonly db: PrismaClient,
    private readonly client: YouTubeClient,
    private readonly vault: TokenVault,
  ) {}
  async validToken(id: string): Promise<string> {
    const result = await this.currentToken(id);
    if ('error' in result) throw result.error;
    const guard = {
      id,
      status: 'CONNECTED' as const,
      tokenCiphertext: { equals: result.account.tokenCiphertext! },
    };
    try {
      await this.client.channel(result.token, result.account.providerAccountId);
      const changed = await this.db.socialAccount.updateMany({
        where: guard,
        data: { tokenCheckedAt: new Date() },
      });
      if (!changed.count) throw new YouTubeError('CONNECTION_CHANGED');
      return result.token;
    } catch (error) {
      if (
        error instanceof YouTubeError &&
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
          account.provider !== 'YOUTUBE' ||
          account.status !== 'CONNECTED' ||
          !account.tokenCiphertext ||
          !account.tokenExpiresAt
        )
          return { error: new YouTubeError('RECONNECT_REQUIRED') };
        let bundle = bundleSchema.parse(
          JSON.parse(
            this.vault.open(
              account.tokenCiphertext,
              account.providerAccountId,
              account.tokenKeyVersion,
            ),
          ),
        );
        if (!YOUTUBE_SCOPES.every((scope) => bundle.scopes.includes(scope)))
          return { error: new YouTubeError('PERMISSION_REQUIRED') };
        if (account.tokenExpiresAt.getTime() <= Date.now() + 300000) {
          if (
            bundle.refreshExpiresAt &&
            new Date(bundle.refreshExpiresAt).getTime() <= Date.now()
          ) {
            await tx.socialAccount.update({ where: { id }, data: { status: 'EXPIRED' } });
            return { error: new YouTubeError('TOKEN_EXPIRED') };
          }
          try {
            const token = await this.client.refresh(bundle.refreshToken);
            const data = youtubeTokenData(this.vault, account.providerAccountId, token, bundle);
            if (!YOUTUBE_SCOPES.every((scope) => data.scopes.includes(scope)))
              throw new YouTubeError('PERMISSION_REQUIRED');
            account = await tx.socialAccount.update({ where: { id }, data });
            bundle = bundleSchema.parse(
              JSON.parse(this.vault.open(account.tokenCiphertext!, account.providerAccountId)),
            );
          } catch (error) {
            if (
              error instanceof YouTubeError &&
              (error.uncertain || ['TOKEN_REVOKED', 'PERMISSION_REQUIRED'].includes(error.code))
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
        provider: 'YOUTUBE',
        status: 'CONNECTED',
        OR: [
          { tokenExpiresAt: { lt: new Date(Date.now() + 3600000) } },
          { tokenCheckedAt: null },
          { tokenCheckedAt: { lt: new Date(Date.now() - 6 * 3600000) } },
        ],
      },
      select: { id: true },
      orderBy: [{ tokenCheckedAt: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
      take: 100,
    });
    for (const account of accounts) {
      try {
        await this.validToken(account.id);
      } catch (error) {
        if (!(error instanceof YouTubeError)) throw error;
      }
    }
    await this.db.oAuthAttempt.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}
