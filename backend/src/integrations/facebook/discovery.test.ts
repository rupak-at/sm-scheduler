import { describe, expect, it, vi } from 'vitest';
import { FacebookClient } from './client.js';
import { FACEBOOK_SCOPES } from './schemas.js';
const clientOptions = {
  appId: '123',
  appSecret: 'private-app-secret',
  redirectUri: 'https://web.example/api/auth/facebook/callback',
  version: 'v26.0',
};
function discovery(
  options: { missingScope?: boolean; noTasks?: boolean; unsafePagination?: boolean } = {},
) {
  let pageCalls = 0;
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('oauth/access_token'))
      return Response.json({ access_token: 'user-secret' });
    if (url.pathname.endsWith('debug_token')) {
      const user = url.searchParams.get('input_token') === 'user-secret';
      return Response.json({
        data: {
          app_id: '123',
          type: user ? 'USER' : 'PAGE',
          is_valid: true,
          ...(user ? { user_id: '333' } : { profile_id: url.searchParams.get('input_token') }),
          expires_at: 0,
          data_access_expires_at: 0,
          scopes: options.missingScope ? [] : FACEBOOK_SCOPES,
        },
      });
    }
    if (url.pathname.endsWith('me/accounts')) {
      pageCalls++;
      const page = {
        id: pageCalls === 1 ? '111' : '222',
        name: 'Page',
        access_token: pageCalls === 1 ? '111' : '222',
        tasks: options.noTasks ? ['ANALYZE'] : ['CREATE_CONTENT'],
      };
      return Response.json({
        data: [page],
        ...(pageCalls === 1
          ? {
              paging: {
                next: 'https://evil.example/leak',
                ...(options.unsafePagination ? {} : { cursors: { after: 'cursor' } }),
              },
            }
          : {}),
      });
    }
    return Response.json({
      id: new Headers(init?.headers).get('Authorization')?.split(' ')[1],
      name: 'Page',
    });
  });
  return { client: new FacebookClient(clientOptions, fetcher), fetcher };
}

describe('Facebook Page discovery trust boundaries', () => {
  it('discovers all authorized Pages while rebuilding pagination on the trusted Graph host', async () => {
    const fixture = discovery();
    expect((await fixture.client.exchange('code')).map((page) => page.id)).toEqual(['111', '222']);
    expect(
      fixture.fetcher.mock.calls.every(
        ([url]) => new URL(String(url)).origin === 'https://graph.facebook.com',
      ),
    ).toBe(true);
    const pages = fixture.fetcher.mock.calls.filter(([url]) =>
      String(url).includes('/me/accounts'),
    );
    expect(new URL(String(pages[1]![0])).searchParams.get('after')).toBe('cursor');
  });
  it('rejects absent grants and Page tasks instead of trusting requested scopes', async () => {
    await expect(discovery({ missingScope: true }).client.exchange('code')).rejects.toThrow(
      'PERMISSION_REQUIRED',
    );
    await expect(discovery({ noTasks: true }).client.exchange('code')).rejects.toThrow(
      'NO_ELIGIBLE_PAGES',
    );
  });
  it('rejects missing pagination cursors and never follows a provider-supplied foreign URL', async () => {
    const fixture = discovery({ unsafePagination: true });
    await expect(fixture.client.exchange('code')).rejects.toThrow('INVALID_PROVIDER_RESPONSE');
    expect(fixture.fetcher.mock.calls.some(([url]) => String(url).includes('evil.example'))).toBe(
      false,
    );
  });
});
