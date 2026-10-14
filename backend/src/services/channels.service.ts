import { WorkspaceError } from '../lib/workspace-error.js';
import type { WorkspaceServices } from '../types/workspace.types.js';

export async function updateChannel(
  { database, tokens, facebookTokens }: WorkspaceServices,
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
          : undefined;
    if (!providerTokens) throw new WorkspaceError(503, 'This provider is not configured.');
    await providerTokens.validToken(id);
  } else {
    await database.socialAccount.update({
      where: { id },
      data: { status: 'DISCONNECTED', tokenCiphertext: null },
    });
  }
}
