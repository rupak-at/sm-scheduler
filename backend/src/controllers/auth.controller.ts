import type { RequestHandler } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import type { AuthGateway } from '../types/auth.types.js';

export function createSessionController(auth: AuthGateway): RequestHandler {
  return async (request, response) => {
    response.set('Cache-Control', 'no-store');
    const session = await auth.getSession(fromNodeHeaders(request.headers));
    if (!session) {
      response.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { id, name, email } = session.user;
    response.json({ user: { id, name, email } });
  };
}
