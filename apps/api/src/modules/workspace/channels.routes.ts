import { Router } from 'express';
import { z } from 'zod';
import { WorkspaceError } from './errors.js';
import type { WorkspaceServices } from './workspace.types.js';
export function channelsRouter({ database, tokens }: WorkspaceServices) {
  const router = Router();
  router.post('/channels/:id/:action', async (request, response) => {
    const id = z.uuid().parse(request.params.id);
    const action = z.enum(['validate', 'disconnect']).parse(request.params.action);
    if (
      !(await database.socialAccount.findFirst({ where: { id, userId: response.locals.userId } }))
    )
      throw new WorkspaceError(404, 'Channel not found.');
    if (action === 'validate') {
      if (!tokens) throw new WorkspaceError(503, 'Instagram is not configured.');
      await tokens.validToken(id);
    } else
      await database.socialAccount.update({
        where: { id },
        data: { status: 'DISCONNECTED', tokenCiphertext: null },
      });
    response.json({ success: true });
  });
  return router;
}
