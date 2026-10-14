import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { facebookRequest, FacebookError } from './http.js';
import { validateFacebookGrant } from './grants.js';
import {
  FACEBOOK_SCOPES,
  tokenSchema,
  pagesSchema,
  debugSchema,
  id,
  photoResultSchema,
  videoStatusSchema,
} from './schemas.js';
import type { FacebookPageAuthorization } from './schemas.js';

export interface FacebookOptions {
  appId: string;
  appSecret: string;
  redirectUri: string;
  version: string;
  configId?: string;
}
export class FacebookClient {
  constructor(
    private readonly options: FacebookOptions,
    private readonly fetcher = fetch,
  ) {}
  authorizationUrl(state: string): string {
    const url = new URL(`https://www.facebook.com/${this.options.version}/dialog/oauth`);
    url.search = new URLSearchParams({
      client_id: this.options.appId,
      redirect_uri: this.options.redirectUri,
      response_type: 'code',
      scope: FACEBOOK_SCOPES.join(','),
      state,
      auth_type: 'rerequest',
      ...(this.options.configId ? { config_id: this.options.configId } : {}),
    }).toString();
    return url.toString();
  }
  async exchange(code: string): Promise<FacebookPageAuthorization[]> {
    const short = await this.graph(
      'oauth/access_token',
      '',
      {
        client_id: this.options.appId,
        client_secret: this.options.appSecret,
        redirect_uri: this.options.redirectUri,
        code,
      },
      tokenSchema,
    );
    const long = await this.graph(
      'oauth/access_token',
      '',
      {
        grant_type: 'fb_exchange_token',
        client_id: this.options.appId,
        client_secret: this.options.appSecret,
        fb_exchange_token: short.access_token,
      },
      tokenSchema,
    );
    const grant = await this.inspect(long.access_token);
    validateFacebookGrant(grant, this.options.appId);
    const pages = await this.managedPages(long.access_token);
    const allowed = pages.filter((page) => page.tasks.includes('CREATE_CONTENT'));
    if (!allowed.length) throw new FacebookError('NO_ELIGIBLE_PAGES');
    const authorizations: FacebookPageAuthorization[] = [];
    for (const page of allowed) {
      const checked = await this.validate(page.access_token, page.id);
      authorizations.push({
        id: page.id,
        name: checked.name,
        token: page.access_token,
        expiresAt: checked.expiresAt,
        scopes: checked.scopes,
        tasks: page.tasks,
      });
    }
    return authorizations;
  }
  async validate(token: string, pageId: string) {
    const grant = await this.inspect(token);
    const expiresAt = validateFacebookGrant(grant, this.options.appId, pageId);
    const page = await this.graph(
      'me',
      token,
      { fields: 'id,name' },
      z.object({ id, name: z.string() }),
    );
    if (page.id !== pageId) throw new FacebookError('ACCOUNT_MISMATCH');
    return { name: page.name, expiresAt, scopes: grant.scopes };
  }
  publishPhoto(pageId: string, token: string, url: string, caption: string) {
    return this.graph(
      `${pageId}/photos`,
      token,
      { url, caption, published: 'true' },
      photoResultSchema,
      true,
    );
  }
  publishVideo(pageId: string, token: string, fileUrl: string, caption: string) {
    return this.graph(
      `${pageId}/videos`,
      token,
      { file_url: fileUrl, description: caption, published: 'true' },
      z.object({ id }),
      true,
      'graph-video.facebook.com',
    );
  }
  videoStatus(videoId: string, token: string) {
    return this.graph(videoId, token, { fields: 'id,status,published' }, videoStatusSchema);
  }
  private async inspect(token: string) {
    const result = await this.graph(
      'debug_token',
      `${this.options.appId}|${this.options.appSecret}`,
      { input_token: token },
      debugSchema,
    );
    return result.data;
  }
  private async managedPages(token: string) {
    const pages: z.infer<typeof pagesSchema>['data'] = [];
    let after: string | undefined;
    // Rebuild pagination URLs on the trusted host rather than following provider-supplied URLs.
    for (let count = 0; count < 20; count++) {
      const result = await this.graph(
        'me/accounts',
        token,
        { fields: 'id,name,access_token,tasks', limit: '100', ...(after ? { after } : {}) },
        pagesSchema,
      );
      pages.push(...result.data);
      if (!result.paging?.next) return pages;
      const cursor = result.paging.cursors?.after;
      if (!cursor || cursor === after) throw new FacebookError('INVALID_PROVIDER_RESPONSE');
      after = cursor;
    }
    throw new FacebookError('TOO_MANY_PAGES');
  }
  private graph<T>(
    path: string,
    token: string,
    params: Record<string, string>,
    schema: z.ZodType<T>,
    post = false,
    host = 'graph.facebook.com',
  ) {
    const url = new URL(`https://${host}/${this.options.version}/${path}`);
    const body = new URLSearchParams(params);
    if (token)
      body.set(
        'appsecret_proof',
        createHmac('sha256', this.options.appSecret).update(token).digest('hex'),
      );
    if (!post) url.search = body.toString();
    return facebookRequest(
      this.fetcher,
      url,
      {
        method: post ? 'POST' : 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        ...(post ? { body } : {}),
      },
      schema,
    );
  }
}
