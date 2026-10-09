import { createAuthEndpoint, getSessionFromCtx, APIError } from 'better-auth/api';
import { z } from 'zod';
import type { PrismaClient } from '@social-scheduler/database';
import type { InstagramClient, TokenVault } from '@social-scheduler/publishing';
import { createOAuthState } from './oauth-state.js';
import { completeInstagramCallback } from './oauth-callback.js';

export interface InstagramPluginOptions {
  database: PrismaClient;
  client: InstagramClient;
  vault: TokenVault;
  webOrigin: string;
  production: boolean;
}
export function instagramPlugin(options: InstagramPluginOptions) {
  const { database, client } = options;
  const cookie = options.production ? '__Secure-instagram-state' : 'instagram-state';
  const cookieOptions = {
    httpOnly: true,
    secure: options.production,
    sameSite: 'lax' as const,
    path: '/api/auth/instagram',
    maxAge: 600,
  };
  return {
    id: 'instagram-login',
    endpoints: {
      instagramStart: createAuthEndpoint(
        '/instagram/start',
        { method: 'POST', body: z.object({ mode: z.enum(['login', 'connect']) }) },
        async (ctx) => {
          const session = await getSessionFromCtx(ctx);
          if (ctx.body.mode === 'connect' && !session) throw new APIError('UNAUTHORIZED');
          if (ctx.body.mode === 'login' && session)
            throw new APIError('BAD_REQUEST', {
              message: 'Use Connect Instagram in your workspace.',
            });
          const { state, browser } = await createOAuthState(
            database,
            ctx.body.mode,
            session?.user.id,
            session?.session.id,
          );
          await ctx.setSignedCookie(cookie, browser, ctx.context.secret, cookieOptions);
          return ctx.json({ url: client.authorizationUrl(state) });
        },
      ),
      instagramCallback: createAuthEndpoint(
        '/instagram/callback',
        {
          method: 'GET',
          query: z.object({
            state: z.string().max(128).optional(),
            code: z.string().max(2048).optional(),
            error: z.string().optional(),
            error_description: z.string().optional(),
          }),
        },
        async (ctx) => completeInstagramCallback(ctx, ctx.query, options, cookie),
      ),
    },
  };
}
