import { z } from 'zod';
import { instagramRequest, InstagramError } from './http.js';

export const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_content_publish'];
const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
});
const shortTokenItem = z.object({
  access_token: z.string(),
  user_id: z.union([z.string(), z.number()]),
});
const shortTokenSchema = z
  .union([shortTokenItem, z.object({ data: z.tuple([shortTokenItem]) })])
  .transform((value) => ('data' in value ? value.data[0] : value));
const profileSchema = z.object({
  id: z.string(),
  user_id: z.string().optional(),
  username: z.string(),
  account_type: z.enum(['BUSINESS', 'MEDIA_CREATOR']),
});
const permissionsSchema = z.object({
  data: z.array(z.object({ permission: z.string(), status: z.string() })),
});
const idSchema = z.object({ id: z.string() });
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
    );
    const url = new URL('https://graph.instagram.com/access_token');
    url.search = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.options.appSecret,
      access_token: short.access_token,
    }).toString();
    const token = await instagramRequest(this.fetcher, url, {}, tokenSchema);
    const profile = await this.validate(token.access_token);
    // Profile identity is authoritative; numeric OAuth user_id values can exceed JS safe integers.
    return {
      token: token.access_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      profile,
    };
  }
  async validate(token: string, expectedId?: string) {
    const profile = await this.graph(
      'me',
      token,
      { fields: 'id,user_id,username,account_type' },
      profileSchema,
    );
    const id = profile.user_id ?? profile.id;
    if (expectedId && id !== expectedId) throw new InstagramError('ACCOUNT_MISMATCH');
    const permissions = await this.graph(`${id}/permissions`, token, {}, permissionsSchema);
    if (
      !INSTAGRAM_SCOPES.every((scope) =>
        permissions.data.some((item) => item.permission === scope && item.status === 'granted'),
      )
    )
      throw new InstagramError('PERMISSION_REQUIRED');
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
    );
  }
}
