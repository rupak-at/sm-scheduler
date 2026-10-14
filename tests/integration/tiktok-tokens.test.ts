import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTikTokWorkspaceFixture } from './fixtures/tiktok.js';
let fixture: Awaited<ReturnType<typeof createTikTokWorkspaceFixture>>;
let channelId: string;
beforeEach(async () => {
  fixture = await createTikTokWorkspaceFixture();
  channelId = (await fixture.connect()).id;
});
afterEach(async () => {
  await fixture.close();
});
const account = () => fixture.db.socialAccount.findUniqueOrThrow({ where: { id: channelId } });

describe('TikTok rotating refresh-token lifecycle', () => {
  it('serializes concurrent refreshes even after access expiry and persists the rotated refresh token', async () => {
    await fixture.db.socialAccount.update({
      where: { id: channelId },
      data: { tokenExpiresAt: new Date(0) },
    });
    expect(
      await Promise.all([
        fixture.tiktok.tokens.validToken(channelId),
        fixture.tiktok.tokens.validToken(channelId),
      ]),
    ).toEqual(['renewed-secret', 'renewed-secret']);
    expect(fixture.tiktok.state.refreshCalls).toBe(1);
    let stored = await account();
    expect(
      JSON.parse(fixture.tiktok.vault.open(stored.tokenCiphertext!, stored.providerAccountId))
        .refreshToken,
    ).toBe('rotated-refresh-1');
    await fixture.db.socialAccount.update({
      where: { id: channelId },
      data: { tokenExpiresAt: new Date(0) },
    });
    await fixture.tiktok.tokens.validToken(channelId);
    stored = await account();
    expect(
      JSON.parse(fixture.tiktok.vault.open(stored.tokenCiphertext!, stored.providerAccountId))
        .refreshToken,
    ).toBe('rotated-refresh-2');
    expect(fixture.tiktok.state.refreshCalls).toBe(2);
  });
  it('marks expired refresh grants durably and keeps revoked provider errors credential-safe', async () => {
    const stored = await account();
    const bundle = JSON.parse(
      fixture.tiktok.vault.open(stored.tokenCiphertext!, stored.providerAccountId),
    );
    await fixture.db.socialAccount.update({
      where: { id: channelId },
      data: {
        tokenExpiresAt: new Date(0),
        tokenCiphertext: fixture.tiktok.vault.seal(
          JSON.stringify({ ...bundle, refreshExpiresAt: new Date(0).toISOString() }),
          stored.providerAccountId,
        ),
      },
    });
    await expect(fixture.tiktok.tokens.validToken(channelId)).rejects.toThrow('TOKEN_EXPIRED');
    expect((await account()).status).toBe('EXPIRED');
    await fixture.connect();
    fixture.tiktok.state.revoked = true;
    const error = await fixture.tiktok.tokens
      .validToken(channelId)
      .catch((error: unknown) => error);
    expect(error).toMatchObject({ code: 'TOKEN_REVOKED' });
    expect(JSON.stringify(error)).not.toContain('private-secret');
    expect(await account()).toMatchObject({ status: 'REVOKED', tokenCiphertext: null });
  });
  it('requires reconnection after a refresh response is lost instead of blindly reusing a possibly rotated token', async () => {
    await fixture.db.socialAccount.update({
      where: { id: channelId },
      data: { tokenExpiresAt: new Date(0) },
    });
    fixture.tiktok.state.refreshTimeout = true;
    await expect(fixture.tiktok.tokens.validToken(channelId)).rejects.toMatchObject({
      uncertain: true,
    });
    expect(await account()).toMatchObject({ status: 'REVOKED', tokenCiphertext: null });
    await expect(fixture.tiktok.tokens.validToken(channelId)).rejects.toThrow('RECONNECT_REQUIRED');
    expect(fixture.tiktok.state.refreshCalls).toBe(1);
  });
});
