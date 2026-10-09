import { vi } from 'vitest';
import { InstagramClient, INSTAGRAM_SCOPES } from '@social-scheduler/publishing';
export const testSecret = 'integration-only-secret-not-for-production';
export const testKey = Buffer.alloc(32, 7).toString('base64');
export const testOrigin = 'http://localhost:3000';
export function instagramFixture() {
  const state = {
    accountId: '123456',
    username: 'test_creator',
    scopes: true,
    revoked: false,
    containerStatus: 'FINISHED',
    publishTimeout: false,
    containerCalls: 0,
    publishCalls: 0,
    refreshCalls: 0,
  };
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input));
    if (url.pathname === '/oauth/access_token')
      return Response.json({ access_token: 'short-secret', user_id: state.accountId });
    if (url.pathname === '/access_token')
      return Response.json({ access_token: 'long-secret', expires_in: 5184000 });
    if (url.pathname === '/refresh_access_token') {
      state.refreshCalls++;
      return Response.json({ access_token: 'renewed-secret', expires_in: 5184000 });
    }
    if (state.revoked)
      return Response.json(
        { error: { code: 190, message: 'secret-provider-response' } },
        { status: 400 },
      );
    if (url.pathname.endsWith('/me'))
      return Response.json({
        id: state.accountId,
        user_id: state.accountId,
        username: state.username,
        account_type: 'BUSINESS',
      });
    if (url.pathname.endsWith('/permissions'))
      return Response.json({
        data: INSTAGRAM_SCOPES.map((permission) => ({
          permission,
          status: state.scopes ? 'granted' : 'declined',
        })),
      });
    if (url.pathname.endsWith('/media_publish')) {
      state.publishCalls++;
      if (state.publishTimeout) throw new Error('Simulated lost response');
      state.containerStatus = 'PUBLISHED';
      return Response.json({ id: 'remote-post-1' });
    }
    if (url.pathname.endsWith('/media')) {
      state.containerCalls++;
      return Response.json({ id: 'container-1' });
    }
    return Response.json({ status_code: state.containerStatus });
  });
  const client = new InstagramClient(
    {
      appId: '123',
      appSecret: 'test-app-secret',
      redirectUri: 'https://test.example/api/auth/instagram/callback',
      version: 'v25.0',
    },
    fetcher,
  );
  return { client, state, fetcher };
}
