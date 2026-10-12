import { z } from 'zod';
import { instagramRequest, InstagramError } from './http.js';
import type { InstagramOperation } from './http.js';
import {
  tokenSchema,
  shortTokenSchema,
  profileSchema,
  publishingLimitSchema,
  idSchema,
} from './schemas.js';

export const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_content_publish'];
export interface InstagramOptions {
  appId: string;
  appSecret: string;
  redirectUri: string;
  version: string;
}
export class InstagramClient {
  constructor(
    private readonly options: InstagramOptions,
    private readonly fetcher = fetch,
  ) {}
  authorizationUrl(state: string): string {
    const url = new URL('https://www.instagram.com/oauth/authorize');
    url.search = new URLSearchParams({
      client_id: this.options.appId,
      redirect_uri: this.options.redirectUri,
      response_type: 'code',
      scope: INSTAGRAM_SCOPES.join(','),
      state,
      enable_fb_login: '0',
      force_authentication: '1',
    }).toString();
    return url.toString();
  }
  async exchange(code: string) {
    const body = new URLSearchParams({
      client_id: this.options.appId,
      client_secret: this.options.appSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.options.redirectUri,
      code,
    });
    const short = await instagramRequest(
      this.fetcher,
      'https://api.instagram.com/oauth/access_token',
      { method: 'POST', body },
      shortTokenSchema,
      'code_exchange',
    );
    if (!INSTAGRAM_SCOPES.every((scope) => short.permissions.includes(scope)))
      throw new InstagramError('PERMISSION_REQUIRED', false, { operation: 'permissions' });
    const url = new URL('https://graph.instagram.com/access_token');
    url.search = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.options.appSecret,
      access_token: short.access_token,
    }).toString();
    const token = await instagramRequest(this.fetcher, url, {}, tokenSchema, 'token_exchange');
    const profile = await this.validate(token.access_token);
    // Profile identity is authoritative; numeric OAuth user_id values can exceed JS safe integers.
    return {
      token: token.access_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      profile,
      scopes: short.permissions,
    };
  }
  async validate(token: string, expectedId?: string) {
    const profile = await this.graph(
      'me',
      token,
      { fields: 'id,user_id,username,account_type' },
      profileSchema,
      false,
      'profile',
    );
    const id = profile.user_id ?? profile.id;
    if (expectedId && id !== expectedId) throw new InstagramError('ACCOUNT_MISMATCH');
    // Instagram Login has no documented grants-list endpoint. A read-only quota
    // request checks publishing access again during maintenance and before writes.
    await this.graph(
      `${id}/content_publishing_limit`,
      token,
      { fields: 'quota_usage' },
      publishingLimitSchema,
      false,
      'publishing_access',
    );
    return { id, username: profile.username, accountType: profile.account_type };
  }
  async refresh(token: string) {
    const url = new URL('https://graph.instagram.com/refresh_access_token');
    url.search = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: token,
    }).toString();
    return instagramRequest(this.fetcher, url, {}, tokenSchema);
  }
  createContainer(account: string, token: string, imageUrl: string, caption: string) {
    return this.graph(`${account}/media`, token, { image_url: imageUrl, caption }, idSchema, true);
  }
  containerStatus(container: string, token: string) {
    return this.graph(
      container,
      token,
      { fields: 'status_code' },
      z.object({
        status_code: z.enum(['FINISHED', 'IN_PROGRESS', 'PUBLISHED', 'ERROR', 'EXPIRED']),
      }),
    );
  }
  publishContainer(account: string, token: string, container: string) {
    return this.graph(
      `${account}/media_publish`,
      token,
      { creation_id: container },
      idSchema,
      true,
    );
  }
  private graph<T>(
    path: string,
    token: string,
    params: Record<string, string>,
    schema: z.ZodType<T>,
    post = false,
    operation?: InstagramOperation,
  ) {
    const url = new URL(`https://graph.instagram.com/${this.options.version}/${path}`);
    const body = new URLSearchParams(params);
    if (!post) url.search = body.toString();
    return instagramRequest(
      this.fetcher,
      url,
      {
        method: post ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${token}` },
        ...(post ? { body } : {}),
      },
      schema,
      operation,
    );
  }
}
