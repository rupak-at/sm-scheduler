import { APIError, createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import { z } from 'zod';
import type { PrismaClient } from '../../database/index.js';
import type { TikTokClient } from './client.js';
import type { TokenVault } from '../instagram/token-crypto.js';
import { createOAuthState } from '../instagram/oauth/oauth-state.js';
import { completeTikTokCallback } from './oauth-callback.js';

export interface TikTokPluginOptions {
  database: PrismaClient;
  client: TikTokClient;
  vault: TokenVault;
  webOrigin: string;
  production: boolean;
}
export function tiktokPlugin(options: TikTokPluginOptions) {
  const cookie = options.production ? '__Secure-tiktok-state' : 'tiktok-state';
  return {
    id: 'tiktok-connect',
    endpoints: {
      tiktokStart: createAuthEndpoint(
        '/tiktok/start',
        { method: 'POST', body: z.object({}) },
        async (ctx) => {
          const session = await getSessionFromCtx(ctx);
          if (!session) throw new APIError('UNAUTHORIZED');
          const { state, browser } = await createOAuthState(
            options.database,
            'tiktok-connect',
            session.user.id,
            session.session.id,
          );
          await ctx.setSignedCookie(cookie, browser, ctx.context.secret, {
            httpOnly: true,
            secure: options.production,
            sameSite: 'lax',
            path: '/api/auth/tiktok',
            maxAge: 600,
          });
          return ctx.json({ url: options.client.authorizationUrl(state) });
        },
      ),
      tiktokCallback: createAuthEndpoint(
        '/tiktok/callback',
        {
          method: 'GET',
          query: z.object({
            state: z.string().max(128).optional(),
            code: z.string().max(2048).optional(),
            error: z.string().max(256).optional(),
          }),
        },
        async (ctx) => completeTikTokCallback(ctx, ctx.query, options, cookie),
      ),
    },
  };
}
