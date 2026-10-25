import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { youtubeTokenData } from '../../backend/src/integrations/youtube/accounts.js';
import { YOUTUBE_SCOPES } from '../../backend/src/integrations/youtube/schemas.js';
import { createYouTubeWorkspaceFixture } from './fixtures/youtube.js';

let fixture: Awaited<ReturnType<typeof createYouTubeWorkspaceFixture>>;
let channelId: string;
beforeAll(async () => {
  fixture = await createYouTubeWorkspaceFixture();
  channelId = (await fixture.connect()).id;
});
afterAll(async () => {
  await fixture?.close();
});

it('serializes concurrent refresh and retains omitted refresh tokens and granted scopes', async () => {
  await fixture.db.socialAccount.update({
    where: { id: channelId },
    data: { tokenExpiresAt: new Date(0) },
  });
  const results = await Promise.all(
    Array.from({ length: 10 }, () => fixture.youtube.tokens.validToken(channelId)),
  );
  expect(new Set(results).size).toBe(1);
  expect(fixture.youtube.state.refreshCalls).toBe(1);
  const account = await fixture.db.socialAccount.findUniqueOrThrow({ where: { id: channelId } });
  const bundle = JSON.parse(
    fixture.youtube.vault.open(account.tokenCiphertext!, account.providerAccountId),
  ) as { refreshToken: string; scopes: string[] };
  expect(bundle.refreshToken).toBe('fixture-refresh');
  expect(bundle.scopes).toHaveLength(2);
});
it('visits older unchecked accounts before repeatedly checking a fresh batch', async () => {
  const ids = Array.from({ length: 101 }, () => randomUUID());
  await fixture.db.socialAccount.createMany({
    data: ids.map((id, index) => ({
      id,
      userId: fixture.userId,
      provider: 'YOUTUBE',
      providerAccountId: id,
      status: 'CONNECTED',
      ...youtubeTokenData(fixture.youtube.vault, id, {
        access_token: id,
        refresh_token: 'fixture-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: YOUTUBE_SCOPES.join(' '),
      }),
      tokenCheckedAt: new Date(index + 1),
    })),
  });
  const channel = vi
    .spyOn(fixture.youtube.client, 'channel')
    .mockImplementation(async (_token, expected) => ({
      id: expected!,
      snippet: { title: 'Fixture channel' },
    }));
  try {
    await fixture.youtube.tokens.maintain();
    expect(new Set(channel.mock.calls.map(([, id]) => id))).toEqual(new Set(ids.slice(0, 100)));
    await fixture.youtube.tokens.maintain();
    expect(
      await fixture.db.socialAccount.count({
        where: { id: { in: ids }, tokenCheckedAt: { gt: new Date(101) } },
      }),
    ).toBe(101);
  } finally {
    channel.mockRestore();
    await fixture.db.socialAccount.deleteMany({ where: { id: { in: ids } } });
  }
});

it('requires reconnection after an ambiguous refresh response without exposing provider details', async () => {
  await fixture.db.socialAccount.update({
    where: { id: channelId },
    data: { tokenExpiresAt: new Date(0) },
  });
  fixture.youtube.state.refreshTimeout = true;
  await expect(fixture.youtube.tokens.validToken(channelId)).rejects.toThrow(
    'PROVIDER_UNAVAILABLE',
  );
  expect(
    await fixture.db.socialAccount.findUniqueOrThrow({ where: { id: channelId } }),
  ).toMatchObject({ status: 'REVOKED', tokenCiphertext: null });
});
