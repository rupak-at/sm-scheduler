import { fromNodeHeaders } from 'better-auth/node';
import { Router } from 'express';
import type { AuthGateway } from './auth.types.js';

export function createAuthRouter(auth: AuthGateway) {
  const router = Router();
  router.get('/me', async (request, response) => {
    response.set('Cache-Control', 'no-store');
    const session = await auth.getSession(fromNodeHeaders(request.headers));
    if (!session) {
      response.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { id, name, email } = session.user;
    response.json({ user: { id, name, email } });
  });
  return router;
}
