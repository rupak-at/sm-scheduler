import type { PrismaClient } from '../../database/index.js';
import type { InstagramClient } from './client.js';
import { InstagramError } from './http.js';
import type { TokenVault } from './token-crypto.js';

const DAY = 86400000;
export class AccountTokens {
  constructor(
    private readonly db: PrismaClient,
    private readonly client: InstagramClient,
    private readonly vault: TokenVault,
  ) {}
  async validToken(id: string): Promise<string> {
    const account = await this.db.socialAccount.findUniqueOrThrow({ where: { id } });
    if (
      account.provider !== 'INSTAGRAM' ||
      account.status !== 'CONNECTED' ||
      !account.tokenCiphertext ||
      !account.tokenExpiresAt
    )
      throw new InstagramError('RECONNECT_REQUIRED');
    const guard = {
      id,
      tokenCiphertext: { equals: account.tokenCiphertext },
      status: 'CONNECTED' as const,
    };
    if (account.tokenExpiresAt.getTime() <= Date.now()) {
      await this.db.socialAccount.updateMany({ where: guard, data: { status: 'EXPIRED' } });
      throw new InstagramError('TOKEN_EXPIRED');
    }
    let token = this.vault.open(
      account.tokenCiphertext,
      account.providerAccountId,
      account.tokenKeyVersion,
    );
    try {
      await this.client.validate(token, account.providerAccountId);
      const needsRefresh =
        account.tokenExpiresAt.getTime() - Date.now() < 10 * DAY &&
        account.tokenRefreshedAt &&
        Date.now() - account.tokenRefreshedAt.getTime() >= DAY;
      const renewed = needsRefresh ? await this.client.refresh(token) : null;
      if (renewed) {
        token = renewed.access_token;
        await this.client.validate(token, account.providerAccountId);
      }
      const changed = await this.db.socialAccount.updateMany({
        where: guard,
        data: {
          tokenCheckedAt: new Date(),
          ...(renewed
            ? {
                tokenCiphertext: this.vault.seal(token, account.providerAccountId),
                tokenRefreshedAt: new Date(),
                tokenExpiresAt: new Date(Date.now() + renewed.expires_in * 1000),
              }
            : {}),
        },
      });
      if (changed.count !== 1) throw new InstagramError('CONNECTION_CHANGED');
      return token;
    } catch (error) {
      if (
        error instanceof InstagramError &&
        ['TOKEN_REVOKED', 'PERMISSION_REQUIRED', 'ACCOUNT_MISMATCH'].includes(error.code)
      )
        await this.db.socialAccount.updateMany({
          where: guard,
          data: { status: 'REVOKED', tokenCiphertext: null },
        });
      throw error;
    }
  }
  async maintain(): Promise<void> {
    const accounts = await this.db.socialAccount.findMany({
      where: {
        provider: 'INSTAGRAM',
        status: 'CONNECTED',
        OR: [
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
        if (!(error instanceof InstagramError)) throw error;
      }
    }
    await this.db.oAuthAttempt.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}
