import { WorkspaceError } from '../lib/workspace-error.js';
import type { WorkspaceServices } from '../types/workspace.types.js';

export async function updateChannel(
  { database, tokens }: WorkspaceServices,
  userId: string,
  id: string,
  action: 'validate' | 'disconnect',
): Promise<void> {
  if (!(await database.socialAccount.findFirst({ where: { id, userId } })))
    throw new WorkspaceError(404, 'Channel not found.');
  if (action === 'validate') {
    if (!tokens) throw new WorkspaceError(503, 'Instagram is not configured.');
    await tokens.validToken(id);
  } else {
    await database.socialAccount.update({
      where: { id },
      data: { status: 'DISCONNECTED', tokenCiphertext: null },
    });
  }
}
