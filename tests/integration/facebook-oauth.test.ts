import request from 'supertest';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createFacebookWorkspaceFixture } from './fixtures/facebook.js';
import { testOrigin, testKey } from './fixtures/instagram.js';
import { TokenVault } from '../../backend/src/integrations/instagram/token-crypto.js';
let fixture: Awaited<ReturnType<typeof createFacebookWorkspaceFixture>>;
beforeEach(async () => {
  fixture = await createFacebookWorkspaceFixture();
});
afterEach(async () => {
  await fixture.db.oAuthAttempt.deleteMany();
  await fixture.close();
});
async function start() {
  const response = await fixture.agent
    .post('/api/auth/facebook/start')
    .set('Origin', testOrigin)
    .send({});
  expect(response.status).toBe(200);
  return new URL(response.body.url).searchParams.get('state')!;
}
const callback = (state: string) => `/api/auth/facebook/callback?state=${state}&code=test-code`;

describe('Facebook Page connection with real sessions and PostgreSQL', () => {
  it('requires login, the correct origin/browser and one-use state; keeps tokens out of workspace and auth records', async () => {
    expect(
      (
        await request(fixture.app)
          .post('/api/auth/facebook/start')
          .set('Origin', testOrigin)
          .send({})
      ).status,
    ).toBe(401);
    expect(
      (
        await fixture.agent
          .post('/api/auth/facebook/start')
          .set('Origin', 'https://evil.example')
          .send({})
      ).status,
    ).toBe(403);
    const state = await start();
    const calls = fixture.facebook.fetcher.mock.calls.length;
    expect((await request(fixture.app).get(callback(state))).headers.location).toContain(
      'FACEBOOK_INVALID_OAUTH_STATE',
    );
    expect(fixture.facebook.fetcher.mock.calls).toHaveLength(calls);
    expect((await fixture.agent.get(callback(state))).headers.location).toContain(
      'FACEBOOK_connected',
    );
    const page = await fixture.db.socialAccount.findFirstOrThrow({
      where: { userId: fixture.userId, provider: 'FACEBOOK' },
    });
    expect(page).toMatchObject({
      providerAccountId: '778899',
      status: 'CONNECTED',
      tokenExpiresAt: null,
    });
    expect(page.scopes).toEqual(['pages_show_list', 'pages_read_engagement', 'pages_manage_posts']);
    expect(
      new TokenVault(testKey, 'facebook').open(page.tokenCiphertext!, page.providerAccountId),
    ).toBe('page-secret');
    expect(
      await fixture.db.account.count({ where: { userId: fixture.userId, providerId: 'facebook' } }),
    ).toBe(0);
    const workspace = await fixture.agent.get('/api/workspace');
    expect(workspace.body.facebookConfigured).toBe(true);
    expect(workspace.body.channels.map((c: { provider: string }) => c.provider)).toEqual([
      'INSTAGRAM',
      'FACEBOOK',
    ]);
    expect(JSON.stringify(workspace.body)).not.toMatch(
      /page-secret|user-secret|tokenCiphertext|providerMetadata/,
    );
    expect((await fixture.agent.get(callback(state))).headers.location).toContain(
      'FACEBOOK_INVALID_OAUTH_STATE',
    );
  });
  it('rejects expired states and sessions that changed before any provider exchange', async () => {
    const expired = await start();
    await fixture.db.oAuthAttempt.updateMany({ data: { expiresAt: new Date(0) } });
    expect((await fixture.agent.get(callback(expired))).headers.location).toContain(
      'FACEBOOK_INVALID_OAUTH_STATE',
    );
    const changed = await start();
    await fixture.agent.post('/api/auth/sign-out').set('Origin', testOrigin).send({});
    expect((await fixture.agent.get(callback(changed))).headers.location).toContain(
      'FACEBOOK_SESSION_CHANGED',
    );
    expect(fixture.facebook.fetcher).not.toHaveBeenCalled();
  });
});

describe('Facebook Page eligibility and ownership', () => {
  it('rejects declined permissions, missing grants and Pages without content creation access', async () => {
    const declined = await start();
    expect(
      (await fixture.agent.get(`/api/auth/facebook/callback?state=${declined}&error=access_denied`))
        .headers.location,
    ).toContain('FACEBOOK_AUTHORIZATION_DECLINED');
    fixture.facebook.state.denied = true;
    expect((await fixture.agent.get(callback(await start()))).headers.location).toContain(
      'FACEBOOK_PERMISSION_REQUIRED',
    );
    fixture.facebook.state.denied = false;
    fixture.facebook.state.pages[0]!.tasks = ['ANALYZE'];
    expect((await fixture.agent.get(callback(await start()))).headers.location).toContain(
      'FACEBOOK_NO_ELIGIBLE_PAGES',
    );
    expect(
      await fixture.db.socialAccount.count({
        where: { provider: 'FACEBOOK', userId: fixture.userId },
      }),
    ).toBe(0);
  });
  it('connects all authorized eligible Pages and reconnects without creating duplicate identities', async () => {
    fixture.facebook.state.pages.push({
      id: '667788',
      name: 'Second Page',
      access_token: 'page-two-secret',
      tasks: ['CREATE_CONTENT'],
    });
    for (let count = 0; count < 2; count++)
      expect((await fixture.agent.get(callback(await start()))).headers.location).toContain(
        'FACEBOOK_connected',
      );
    expect(
      await fixture.db.socialAccount.count({
        where: { provider: 'FACEBOOK', userId: fixture.userId },
      }),
    ).toBe(2);
    expect((await fixture.agent.get('/api/me')).body.user.id).toBe(fixture.userId);
  });
});

describe('Facebook connection ownership and replay protection', () => {
  it('cannot overwrite a Page owned by another workspace and rolls back the entire connection', async () => {
    const other = await createFacebookWorkspaceFixture();
    try {
      await other.db.socialAccount.create({
        data: { userId: other.userId, provider: 'FACEBOOK', providerAccountId: '667788' },
      });
      fixture.facebook.state.pages.push({
        id: '667788',
        name: 'Other Page',
        access_token: 'other-secret',
        tasks: ['CREATE_CONTENT'],
      });
      expect((await fixture.agent.get(callback(await start()))).headers.location).toContain(
        'FACEBOOK_ACCOUNT_ALREADY_LINKED',
      );
      expect(
        await fixture.db.socialAccount.count({
          where: { provider: 'FACEBOOK', userId: fixture.userId },
        }),
      ).toBe(0);
      expect(
        (
          await fixture.db.socialAccount.findUniqueOrThrow({
            where: {
              provider_providerAccountId: { provider: 'FACEBOOK', providerAccountId: '667788' },
            },
          })
        ).userId,
      ).toBe(other.userId);
    } finally {
      await other.close();
    }
  });
  it('consumes provider-bound modes and rejects a concurrent replay', async () => {
    const state = await start();
    const replies = await Promise.all([
      fixture.agent.get(callback(state)),
      fixture.agent.get(callback(state)),
    ]);
    expect(
      replies.filter((response) => response.headers.location?.includes('FACEBOOK_connected')),
    ).toHaveLength(1);
    expect(
      replies.filter((response) =>
        response.headers.location?.includes('FACEBOOK_INVALID_OAUTH_STATE'),
      ),
    ).toHaveLength(1);
    const cross = await start();
    await fixture.db.oAuthAttempt.updateMany({ data: { mode: 'connect' } });
    const calls = fixture.facebook.fetcher.mock.calls.length;
    expect((await fixture.agent.get(callback(cross))).headers.location).toContain(
      'FACEBOOK_INVALID_OAUTH_STATE',
    );
    expect(fixture.facebook.fetcher.mock.calls).toHaveLength(calls);
  });
});
