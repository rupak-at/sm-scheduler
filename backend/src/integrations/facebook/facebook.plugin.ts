import { APIError, createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import { z } from 'zod';
import type { PrismaClient } from '../../database/index.js';
import type { FacebookClient } from './client.js';
import type { TokenVault } from '../instagram/token-crypto.js';
import { createOAuthState } from '../instagram/oauth/oauth-state.js';
import { completeFacebookCallback } from './oauth-callback.js';

export interface FacebookPluginOptions {
  database: PrismaClient;
  client: FacebookClient;
  vault: TokenVault;
  webOrigin: string;
  production: boolean;
}
export function facebookPlugin(options: FacebookPluginOptions) {
  const cookie = options.production ? '__Secure-facebook-state' : 'facebook-state';
  return {
    id: 'facebook-pages',
    endpoints: {
      facebookStart: createAuthEndpoint(
        '/facebook/start',
        { method: 'POST', body: z.object({}) },
        async (ctx) => {
          const session = await getSessionFromCtx(ctx);
          if (!session) throw new APIError('UNAUTHORIZED');
          const state = await createOAuthState(
            options.database,
            'facebook-connect',
            session.user.id,
            session.session.id,
          );
          await ctx.setSignedCookie(cookie, state.browser, ctx.context.secret, {
            httpOnly: true,
            secure: options.production,
            sameSite: 'lax',
            path: '/api/auth/facebook',
            maxAge: 600,
          });
          return ctx.json({ url: options.client.authorizationUrl(state.state) });
        },
      ),
      facebookCallback: createAuthEndpoint(
        '/facebook/callback',
        {
          method: 'GET',
          query: z.object({
            state: z.string().max(128).optional(),
            code: z.string().max(2048).optional(),
            error: z.string().max(256).optional(),
          }),
        },
        async (ctx) => completeFacebookCallback(ctx, ctx.query, options, cookie),
      ),
    },
  };
}
