import type { GenericEndpointContext } from 'better-auth';
import { getSessionFromCtx } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { InstagramError } from '@social-scheduler/publishing';
import { consumeOAuthState } from './oauth-state.js';
import { saveInstagramIdentity } from './identity.js';
import type { InstagramPluginOptions } from './instagram.plugin.js';
export interface CallbackQuery {
  state?: string | undefined;
  code?: string | undefined;
  error?: string | undefined;
}
export async function completeInstagramCallback(
  ctx: GenericEndpointContext,
  query: CallbackQuery,
  options: InstagramPluginOptions,
  cookie: string,
) {
  const { database, client, vault, webOrigin } = options;
  const cookieOptions = {
    httpOnly: true,
    secure: options.production,
    sameSite: 'lax' as const,
    path: '/api/auth/instagram',
    maxAge: 0,
  };
  let destination = '/login';
  try {
    const browser = await ctx.getSignedCookie(cookie, ctx.context.secret);
    ctx.setCookie(cookie, '', { ...cookieOptions, maxAge: 0 });
    if (!query.state || !browser) throw new InstagramError('INVALID_OAUTH_STATE');
    const attempt = await consumeOAuthState(database, query.state, browser);
    destination = attempt.mode === 'connect' ? '/planner' : '/login';
    if (query.error || !query.code) throw new InstagramError('AUTHORIZATION_DECLINED');
    const session = await getSessionFromCtx(ctx);
    if (attempt.mode === 'login' && session) throw new InstagramError('SESSION_CHANGED');
    if (attempt.mode === 'connect') {
      if (
        !session ||
        session.user.id !== attempt.userId ||
        session.session.id !== attempt.sessionId
      )
        throw new InstagramError('SESSION_CHANGED');
    }
    const authorization = await client.exchange(query.code);
    const user = await saveInstagramIdentity(
      database,
      vault,
      authorization,
      attempt.userId ?? undefined,
    );
    if (attempt.mode === 'login') {
      const session = await ctx.context.internalAdapter.createSession(user.id);
      if (!session) throw new InstagramError('SESSION_UNAVAILABLE');
      await setSessionCookie(ctx, { user, session });
    }
  } catch (error) {
    const code = error instanceof InstagramError ? error.code : 'CONNECTION_FAILED';
    throw ctx.redirect(`${webOrigin}${destination}?connection=${encodeURIComponent(code)}`);
  }
  throw ctx.redirect(`${webOrigin}/planner?connection=connected`);
}
