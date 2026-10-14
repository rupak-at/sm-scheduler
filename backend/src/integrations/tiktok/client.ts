import type { z } from 'zod';
import type { TikTokSettings } from '@social-scheduler/shared';
import { tiktokRequest, TikTokError } from './http.js';
import {
  TIKTOK_SCOPES,
  tokenSchema,
  profileSchema,
  creatorSchema,
  publishSchema,
  statusSchema,
} from './schemas.js';

export interface TikTokOptions {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
}
export class TikTokClient {
  constructor(
    private readonly options: TikTokOptions,
    private readonly fetcher = fetch,
  ) {}
  authorizationUrl(state: string): string {
    const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
    url.search = new URLSearchParams({
      client_key: this.options.clientKey,
      scope: TIKTOK_SCOPES.join(','),
      redirect_uri: this.options.redirectUri,
      state,
      response_type: 'code',
      disable_auto_auth: '1',
    }).toString();
    return url.toString();
  }
  async exchange(code: string) {
    const token = await this.token({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.options.redirectUri,
    });
    const profile = await this.profile(token.access_token, token.open_id);
    return { token, profile };
  }
  async refresh(refreshToken: string, expectedId: string) {
    const token = await this.token({ grant_type: 'refresh_token', refresh_token: refreshToken });
    if (token.open_id !== expectedId) throw new TikTokError('ACCOUNT_MISMATCH');
    return token;
  }
  async profile(token: string, expectedId: string) {
    const profile = await tiktokRequest(
      this.fetcher,
      '/v2/user/info/?fields=open_id,display_name',
      { headers: { Authorization: `Bearer ${token}` } },
      profileSchema,
    );
    if (profile.open_id !== expectedId) throw new TikTokError('ACCOUNT_MISMATCH');
    return profile;
  }
  creatorInfo(token: string) {
    return this.post('/v2/post/publish/creator_info/query/', token, {}, creatorSchema);
  }
  publish(token: string, url: string, caption: string, settings: TikTokSettings, video: boolean) {
    const postInfo = {
      privacy_level: settings.privacy!,
      disable_comment: !settings.allowComment,
      brand_content_toggle: settings.brandedContent,
      brand_organic_toggle: settings.ownBrand,
    };
    return video
      ? this.post(
          '/v2/post/publish/video/init/',
          token,
          {
            post_info: {
              ...postInfo,
              title: caption,
              disable_duet: !settings.allowDuet,
              disable_stitch: !settings.allowStitch,
              is_aigc: settings.aiGenerated,
            },
            source_info: { source: 'PULL_FROM_URL', video_url: url },
          },
          publishSchema,
          true,
        )
      : this.post(
          '/v2/post/publish/content/init/',
          token,
          {
            media_type: 'PHOTO',
            post_mode: 'DIRECT_POST',
            is_aigc: settings.aiGenerated,
            post_info: {
              ...postInfo,
              title: settings.photoTitle,
              description: caption,
              auto_add_music: settings.autoAddMusic,
            },
            source_info: { source: 'PULL_FROM_URL', photo_images: [url], photo_cover_index: 0 },
          },
          publishSchema,
          true,
        );
  }
  status(token: string, publishId: string) {
    return this.post(
      '/v2/post/publish/status/fetch/',
      token,
      { publish_id: publishId },
      statusSchema,
    );
  }
  private async token(params: Record<string, string>) {
    const result = await tiktokRequest(
      this.fetcher,
      '/v2/oauth/token/',
      {
        method: 'POST',
        body: new URLSearchParams({
          client_key: this.options.clientKey,
          client_secret: this.options.clientSecret,
          ...params,
        }),
      },
      tokenSchema,
      params.grant_type === 'refresh_token',
    );
    if (
      !TIKTOK_SCOPES.every((scope) =>
        result.scope
          .split(',')
          .map((s) => s.trim())
          .includes(scope),
      )
    )
      throw new TikTokError('PERMISSION_REQUIRED');
    return result;
  }
  private post<T>(
    path: string,
    token: string,
    body: unknown,
    schema: z.ZodType<T>,
    writes = false,
  ) {
    return tiktokRequest(
      this.fetcher,
      path,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(body),
      },
      schema,
      writes,
    );
  }
}
