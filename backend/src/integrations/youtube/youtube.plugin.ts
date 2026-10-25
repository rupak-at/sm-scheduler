import { APIError, createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import { z } from 'zod';
import type { PrismaClient } from '../../database/index.js';
import type { YouTubeClient } from './client.js';
import { youtubeVerifier } from './client.js';
import type { TokenVault } from '../instagram/token-crypto.js';
import { createOAuthState } from '../instagram/oauth/oauth-state.js';
import { completeYouTubeCallback } from './oauth-callback.js';

export interface YouTubePluginOptions {
  database: PrismaClient;
  client: YouTubeClient;
  vault: TokenVault;
  webOrigin: string;
  production: boolean;
}
export function youtubePlugin(options: YouTubePluginOptions) {
  const cookie = options.production ? '__Secure-youtube-state' : 'youtube-state';
  return {
    id: 'youtube-connect',
    endpoints: {
      youtubeStart: createAuthEndpoint(
        '/youtube/start',
        { method: 'POST', body: z.object({}) },
        async (ctx) => {
          const session = await getSessionFromCtx(ctx);
          if (!session) throw new APIError('UNAUTHORIZED');
          const { state, browser } = await createOAuthState(
            options.database,
            'youtube-connect',
            session.user.id,
            session.session.id,
          );
          await ctx.setSignedCookie(cookie, browser, ctx.context.secret, {
            httpOnly: true,
            secure: options.production,
            sameSite: 'lax',
            path: '/api/auth/youtube',
            maxAge: 600,
          });
          return ctx.json({
            url: options.client.authorizationUrl(
              state,
              youtubeVerifier(ctx.context.secret, state, browser),
            ),
          });
        },
      ),
      youtubeCallback: createAuthEndpoint(
        '/youtube/callback',
        {
          method: 'GET',
          query: z.object({
            state: z.string().max(128).optional(),
            code: z.string().max(2048).optional(),
            error: z.string().max(256).optional(),
          }),
        },
        async (ctx) => completeYouTubeCallback(ctx, ctx.query, options, cookie),
      ),
    },
  };
}
