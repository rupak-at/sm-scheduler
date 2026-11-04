import type { GenericEndpointContext } from 'better-auth';
import { getSessionFromCtx } from 'better-auth/api';
import { consumeOAuthState } from '../instagram/oauth/oauth-state.js';
import { InstagramError } from '../instagram/http.js';
import { TikTokError } from './http.js';
import { tiktokOAuthFailure } from './oauth-error.js';
import { saveTikTokAccount } from './accounts.js';
import type { TikTokPluginOptions } from './tiktok.plugin.js';

export async function completeTikTokCallback(
  ctx: GenericEndpointContext,
  query: { state?: string | undefined; code?: string | undefined; error?: string | undefined },
  options: TikTokPluginOptions,
  cookie: string,
) {
  try {
    const browser = await ctx.getSignedCookie(cookie, ctx.context.secret);
    ctx.setCookie(cookie, '', {
      httpOnly: true,
      secure: options.production,
      sameSite: 'lax',
      path: '/api/auth/tiktok',
      maxAge: 0,
    });
    if (!query.state || !browser) throw new TikTokError('INVALID_OAUTH_STATE');
    const attempt = await consumeOAuthState(options.database, query.state, browser);
    if (attempt.mode !== 'tiktok-connect') throw new TikTokError('INVALID_OAUTH_STATE');
    const session = await getSessionFromCtx(ctx);
    if (!session || session.user.id !== attempt.userId || session.session.id !== attempt.sessionId)
      throw new TikTokError('SESSION_CHANGED');
    if (query.error || !query.code) throw new TikTokError(tiktokOAuthFailure(query.error));
    await saveTikTokAccount(
      options.database,
      options.vault,
      await options.client.exchange(query.code),
      session.user.id,
    );
  } catch (error) {
    const code =
      error instanceof TikTokError || error instanceof InstagramError
        ? error.code
        : 'CONNECTION_FAILED';
    throw ctx.redirect(`${options.webOrigin}/planner?connection=TIKTOK_${code}`);
  }
  throw ctx.redirect(`${options.webOrigin}/planner?connection=TIKTOK_connected`);
}
