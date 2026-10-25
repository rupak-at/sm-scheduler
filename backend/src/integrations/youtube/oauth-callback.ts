import type { GenericEndpointContext } from 'better-auth';
import { getSessionFromCtx } from 'better-auth/api';
import { consumeOAuthState } from '../instagram/oauth/oauth-state.js';
import { InstagramError } from '../instagram/http.js';
import { YouTubeError } from './http.js';
import { youtubeVerifier } from './client.js';
import { saveYouTubeAccount } from './accounts.js';
import type { YouTubePluginOptions } from './youtube.plugin.js';

export async function completeYouTubeCallback(
  ctx: GenericEndpointContext,
  query: { state?: string | undefined; code?: string | undefined; error?: string | undefined },
  options: YouTubePluginOptions,
  cookie: string,
) {
  try {
    const browser = await ctx.getSignedCookie(cookie, ctx.context.secret);
    ctx.setCookie(cookie, '', {
      httpOnly: true,
      secure: options.production,
      sameSite: 'lax',
      path: '/api/auth/youtube',
      maxAge: 0,
    });
    if (!query.state || !browser) throw new YouTubeError('INVALID_OAUTH_STATE');
    const attempt = await consumeOAuthState(options.database, query.state, browser);
    if (attempt.mode !== 'youtube-connect') throw new YouTubeError('INVALID_OAUTH_STATE');
    const session = await getSessionFromCtx(ctx);
    if (!session || session.user.id !== attempt.userId || session.session.id !== attempt.sessionId)
      throw new YouTubeError('SESSION_CHANGED');
    if (query.error || !query.code) throw new YouTubeError('AUTHORIZATION_DECLINED');
    await saveYouTubeAccount(
      options.database,
      options.vault,
      await options.client.exchange(
        query.code,
        youtubeVerifier(ctx.context.secret, query.state, browser),
      ),
      session.user.id,
    );
  } catch (error) {
    const code =
      error instanceof YouTubeError || error instanceof InstagramError
        ? error.code
        : 'CONNECTION_FAILED';
    throw ctx.redirect(`${options.webOrigin}/planner?connection=YOUTUBE_${code}`);
  }
  throw ctx.redirect(`${options.webOrigin}/planner?connection=YOUTUBE_connected`);
}
