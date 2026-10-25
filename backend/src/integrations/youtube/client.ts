import { createHash, createHmac } from 'node:crypto';
import { youtubeResponse, youtubeJson, YouTubeError } from './http.js';
import {
  YOUTUBE_SCOPES,
  tokenSchema,
  channelListSchema,
  videoListSchema,
  grantedScopes,
} from './schemas.js';

export interface YouTubeOptions {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}
export function youtubeVerifier(secret: string, state: string, browser: string): string {
  return createHmac('sha256', secret)
    .update(`youtube-pkce:${state}:${browser}`)
    .digest('base64url');
}
export class YouTubeClient {
  constructor(
    private readonly options: YouTubeOptions,
    private readonly fetcher = fetch,
  ) {}
  authorizationUrl(state: string, verifier: string): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: this.options.clientId,
      redirect_uri: this.options.redirectUri,
      response_type: 'code',
      scope: YOUTUBE_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent select_account',
      state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }).toString();
    return url.toString();
  }
  async exchange(code: string, verifier: string) {
    const token = await this.token({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: this.options.redirectUri,
    });
    if (!token.refresh_token) throw new YouTubeError('OFFLINE_ACCESS_REQUIRED');
    if (!YOUTUBE_SCOPES.every((scope) => grantedScopes(token.scope).includes(scope)))
      throw new YouTubeError('PERMISSION_REQUIRED');
    return { token, channel: await this.channel(token.access_token) };
  }
  refresh(refreshToken: string) {
    return this.token({ grant_type: 'refresh_token', refresh_token: refreshToken });
  }
  async channel(token: string, expectedId?: string) {
    const url = new URL('https://www.googleapis.com/youtube/v3/channels');
    url.search = new URLSearchParams({
      part: 'snippet',
      mine: 'true',
      maxResults: '50',
    }).toString();
    const result = await youtubeJson(
      await youtubeResponse(this.fetcher, url, { headers: { Authorization: `Bearer ${token}` } }),
      channelListSchema,
    );
    if (result.items.length !== 1 || result.nextPageToken)
      throw new YouTubeError('CHANNEL_SELECTION_REQUIRED');
    const channel = result.items[0]!;
    if (expectedId && channel.id !== expectedId) throw new YouTubeError('ACCOUNT_MISMATCH');
    return channel;
  }
  async video(token: string, id: string) {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.search = new URLSearchParams({ part: 'snippet,status', id }).toString();
    const result = await youtubeJson(
      await youtubeResponse(this.fetcher, url, { headers: { Authorization: `Bearer ${token}` } }),
      videoListSchema,
    );
    if (!result.items[0]) throw new YouTubeError('REMOTE_NOT_FOUND');
    return result.items[0];
  }
  private async token(params: Record<string, string>) {
    return youtubeJson(
      await youtubeResponse(
        this.fetcher,
        'https://oauth2.googleapis.com/token',
        {
          method: 'POST',
          body: new URLSearchParams({
            client_id: this.options.clientId,
            client_secret: this.options.clientSecret,
            ...params,
          }),
        },
        params.grant_type === 'refresh_token',
      ),
      tokenSchema,
      params.grant_type === 'refresh_token',
    );
  }
}
