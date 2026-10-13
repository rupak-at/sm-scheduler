import type { RequestHandler } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import type { AuthGateway } from '../types/auth.types.js';
import type { PrismaClient } from '../database/index.js';
import { randomUUID } from 'node:crypto';

export function workspaceAuthorization(
  auth: AuthGateway,
  db: PrismaClient,
  origin: string,
): RequestHandler {
  return async (request, response, next) => {
    if (!['GET', 'HEAD'].includes(request.method) && request.headers.origin !== origin) {
      response.status(403).json({ error: 'Request origin is not allowed.' });
      return;
    }
    const session = await auth.getSession(fromNodeHeaders(request.headers));
    if (!session) {
      response.status(401).json({ error: 'Log in to your workspace.' });
      return;
    }
    response.locals.userId = session.user.id;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const now = Date.now();
      const counters = await db.$queryRaw<{ count: number }[]>`
        INSERT INTO "RateLimit" (id, key, count, "lastRequest")
        VALUES (${randomUUID()}, ${`workspace:${session.user.id}`}, 1, ${BigInt(now)})
        ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "RateLimit"."lastRequest" < ${BigInt(now - 60000)}
        THEN 1 ELSE "RateLimit".count + 1 END,
        "lastRequest" = CASE WHEN "RateLimit"."lastRequest" < ${BigInt(now - 60000)}
        THEN ${BigInt(now)} ELSE "RateLimit"."lastRequest" END RETURNING count`;
      if ((counters[0]?.count ?? 100) > 30) {
        response
          .set('Retry-After', '60')
          .status(429)
          .json({ error: 'Too many changes. Try again in a minute.' });
        return;
      }
    }
    next();
  };
}
