import type { Prisma } from '../database/index.js';

export function eligibleChannelWhere(
  providers: ('INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE')[],
): Prisma.SocialAccountWhereInput {
  return {
    provider: { in: providers },
    status: 'CONNECTED',
    tokenCiphertext: { not: null },
    OR: [{ tokenExpiresAt: { gt: new Date() } }, { provider: 'FACEBOOK', tokenExpiresAt: null }],
  };
}
export function channelCanSchedule(account: {
  provider: string;
  status: string;
  tokenCiphertext: Uint8Array | null;
  tokenExpiresAt: Date | null;
}): boolean {
  return (
    account.status === 'CONNECTED' &&
    account.tokenCiphertext !== null &&
    (account.tokenExpiresAt
      ? account.tokenExpiresAt.getTime() > Date.now()
      : account.provider === 'FACEBOOK')
  );
}
