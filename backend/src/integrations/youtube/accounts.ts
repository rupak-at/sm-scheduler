import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../database/index.js';
import type { TokenVault } from '../instagram/token-crypto.js';
import type { YouTubeClient } from './client.js';
import type { YouTubeToken } from './schemas.js';
import { grantedScopes } from './schemas.js';
import { YouTubeError } from './http.js';

export function youtubeTokenData(
  vault: TokenVault,
  channelId: string,
  token: YouTubeToken,
  previous?: { refreshToken: string; scopes: string[]; refreshExpiresAt: string | null },
) {
  const refreshToken = token.refresh_token ?? previous?.refreshToken;
  if (!refreshToken) throw new YouTubeError('OFFLINE_ACCESS_REQUIRED');
  const scopes =
    token.scope === undefined && previous ? previous.scopes : grantedScopes(token.scope);
  const refreshExpiresAt = token.refresh_token_expires_in
    ? new Date(Date.now() + token.refresh_token_expires_in * 1000).toISOString()
    : (previous?.refreshExpiresAt ?? null);
  return {
    tokenCiphertext: vault.seal(
      JSON.stringify({ accessToken: token.access_token, refreshToken, scopes, refreshExpiresAt }),
      channelId,
    ),
    scopes,
    tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
    tokenRefreshedAt: new Date(),
    tokenCheckedAt: new Date(),
    tokenKeyVersion: 1,
  };
}
export async function saveYouTubeAccount(
  db: PrismaClient,
  vault: TokenVault,
  auth: Awaited<ReturnType<YouTubeClient['exchange']>>,
  userId: string,
) {
  const data = youtubeTokenData(vault, auth.channel.id, auth.token);
  // A conflicting channel may update only its current owner, including during
  // simultaneous callbacks. An email/name match never grants ownership.
  const rows = await db.$queryRaw<{ id: string }[]>`
    INSERT INTO "SocialAccount" (id, "userId", provider, "providerAccountId", "displayName", status, "tokenCiphertext", "tokenKeyVersion", "tokenExpiresAt", "tokenRefreshedAt", "tokenCheckedAt", scopes, "updatedAt")
    VALUES (${randomUUID()}::uuid, ${userId}::uuid, 'YOUTUBE', ${auth.channel.id}, ${auth.channel.snippet.title}, 'CONNECTED', ${data.tokenCiphertext}, 1, ${data.tokenExpiresAt}, ${data.tokenRefreshedAt}, ${data.tokenCheckedAt}, ${data.scopes}::text[], now())
    ON CONFLICT (provider, "providerAccountId") DO UPDATE SET "displayName" = EXCLUDED."displayName", status = 'CONNECTED', "tokenCiphertext" = EXCLUDED."tokenCiphertext", "tokenKeyVersion" = 1,
      "tokenExpiresAt" = EXCLUDED."tokenExpiresAt", "tokenRefreshedAt" = EXCLUDED."tokenRefreshedAt", "tokenCheckedAt" = EXCLUDED."tokenCheckedAt", scopes = EXCLUDED.scopes, "updatedAt" = now()
    WHERE "SocialAccount"."userId" = ${userId}::uuid RETURNING id`;
  if (!rows.length) throw new YouTubeError('ACCOUNT_ALREADY_LINKED');
}
