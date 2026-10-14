import type { PrismaClient } from '../../database/index.js';
import type { TokenVault } from '../instagram/token-crypto.js';
import type { FacebookClient } from './client.js';
import { FacebookError } from './http.js';

export class FacebookAccountTokens {
  constructor(
    private readonly db: PrismaClient,
    private readonly client: FacebookClient,
    private readonly vault: TokenVault,
  ) {}
  async validToken(id: string): Promise<string> {
    const account = await this.db.socialAccount.findUniqueOrThrow({ where: { id } });
    if (
      account.provider !== 'FACEBOOK' ||
      account.status !== 'CONNECTED' ||
      !account.tokenCiphertext
    )
      throw new FacebookError('RECONNECT_REQUIRED');
    const guard = {
      id,
      status: 'CONNECTED' as const,
      tokenCiphertext: { equals: account.tokenCiphertext },
    };
    if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() <= Date.now()) {
      await this.db.socialAccount.updateMany({ where: guard, data: { status: 'EXPIRED' } });
      throw new FacebookError('TOKEN_EXPIRED');
    }
    const token = this.vault.open(
      account.tokenCiphertext,
      account.providerAccountId,
      account.tokenKeyVersion,
    );
    try {
      const checked = await this.client.validate(token, account.providerAccountId);
      const saved = await this.db.socialAccount.updateMany({
        where: guard,
        data: {
          tokenCheckedAt: new Date(),
          tokenExpiresAt: checked.expiresAt,
          scopes: checked.scopes,
        },
      });
      if (saved.count !== 1) throw new FacebookError('CONNECTION_CHANGED');
      return token;
    } catch (error) {
      if (error instanceof FacebookError) {
        if (error.code === 'TOKEN_EXPIRED')
          await this.db.socialAccount.updateMany({ where: guard, data: { status: 'EXPIRED' } });
        else if (['TOKEN_REVOKED', 'PERMISSION_REQUIRED', 'ACCOUNT_MISMATCH'].includes(error.code))
          await this.db.socialAccount.updateMany({
            where: guard,
            data: { status: 'REVOKED', tokenCiphertext: null },
          });
      }
      throw error;
    }
  }
  async maintain(): Promise<void> {
    const accounts = await this.db.socialAccount.findMany({
      where: {
        provider: 'FACEBOOK',
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
        if (!(error instanceof FacebookError)) throw error;
      }
    }
    await this.db.oAuthAttempt.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}
