import type { WorkspaceServices } from '../types/workspace.types.js';
import { WorkspaceError } from '../lib/workspace-error.js';

export async function readTikTokCreator(services: WorkspaceServices, userId: string, id: string) {
  const account = await services.database.socialAccount.findFirst({
    where: { id, userId, provider: 'TIKTOK' },
  });
  if (!account) throw new WorkspaceError(404, 'TikTok account not found.');
  if (!services.tiktok) throw new WorkspaceError(503, 'TikTok is not configured.');
  const token = await services.tiktok.tokens.validToken(id);
  return {
    creator: await services.tiktok.client.creatorInfo(token),
    audited: services.tiktok.audited,
  };
}
