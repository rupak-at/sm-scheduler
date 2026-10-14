import type { GenericEndpointContext } from 'better-auth';
import { getSessionFromCtx } from 'better-auth/api';
import { consumeOAuthState } from '../instagram/oauth/oauth-state.js';
import { InstagramError } from '../instagram/http.js';
import { FacebookError } from './http.js';
import { saveFacebookPages } from './accounts.js';
import type { FacebookPluginOptions } from './facebook.plugin.js';

export async function completeFacebookCallback(
  ctx: GenericEndpointContext,
  query: { state?: string | undefined; code?: string | undefined; error?: string | undefined },
  options: FacebookPluginOptions,
  cookie: string,
) {
  try {
    const browser = await ctx.getSignedCookie(cookie, ctx.context.secret);
    ctx.setCookie(cookie, '', {
      httpOnly: true,
      secure: options.production,
      sameSite: 'lax',
      path: '/api/auth/facebook',
      maxAge: 0,
    });
    if (!query.state || !browser) throw new FacebookError('INVALID_OAUTH_STATE');
    const attempt = await consumeOAuthState(options.database, query.state, browser);
    if (attempt.mode !== 'facebook-connect') throw new FacebookError('INVALID_OAUTH_STATE');
    const session = await getSessionFromCtx(ctx);
    if (!session || session.user.id !== attempt.userId || session.session.id !== attempt.sessionId)
      throw new FacebookError('SESSION_CHANGED');
    if (query.error || !query.code) throw new FacebookError('AUTHORIZATION_DECLINED');
    const pages = await options.client.exchange(query.code);
    await saveFacebookPages(options.database, options.vault, pages, session.user.id);
  } catch (error) {
    const code =
      error instanceof FacebookError || error instanceof InstagramError
        ? error.code
        : 'CONNECTION_FAILED';
    throw ctx.redirect(`${options.webOrigin}/planner?connection=FACEBOOK_${code}`);
  }
  throw ctx.redirect(`${options.webOrigin}/planner?connection=FACEBOOK_connected`);
}
