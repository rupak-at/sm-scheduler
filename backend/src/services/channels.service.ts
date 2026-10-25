import { WorkspaceError } from '../lib/workspace-error.js';
import type { WorkspaceServices } from '../types/workspace.types.js';

export async function updateChannel(
  { database, tokens, facebookTokens, tiktok, youtube }: WorkspaceServices,
  userId: string,
  id: string,
  action: 'validate' | 'disconnect',
): Promise<void> {
  const account = await database.socialAccount.findFirst({ where: { id, userId } });
  if (!account) throw new WorkspaceError(404, 'Channel not found.');
  if (action === 'validate') {
    const providerTokens =
      account.provider === 'FACEBOOK'
        ? facebookTokens
        : account.provider === 'INSTAGRAM'
          ? tokens
          : account.provider === 'TIKTOK'
            ? tiktok?.tokens
            : account.provider === 'YOUTUBE'
              ? youtube?.tokens
              : undefined;
    if (!providerTokens) throw new WorkspaceError(503, 'This provider is not configured.');
    const token = await providerTokens.validToken(id);
    if (account.provider === 'TIKTOK' && tiktok) await tiktok.client.creatorInfo(token);
  } else {
    await database.socialAccount.update({
      where: { id },
      data: { status: 'DISCONNECTED', tokenCiphertext: null },
    });
  }
}
