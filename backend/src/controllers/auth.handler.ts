import type { RequestHandler } from 'express';
import type { AuthGateway } from '../types/auth.types.js';

export function createAuthHandler(auth: AuthGateway, webOrigin: string): RequestHandler {
  return (request, response, next) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      request.get('origin') !== webOrigin
    ) {
      response.status(403).json({ error: 'Untrusted authentication origin' });
      return;
    }
    return auth.handler(request, response, next);
  };
}
