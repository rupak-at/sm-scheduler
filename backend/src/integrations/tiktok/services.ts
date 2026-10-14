import type { PrismaClient } from '../../database/index.js';
import { tiktokCredentials } from '../../config/tiktok.js';
import type { TikTokEnvironment } from '../../config/tiktok.js';
import { TokenVault } from '../instagram/token-crypto.js';
import { TikTokClient } from './client.js';
import { TikTokAccountTokens } from './account-tokens.js';

export function createTikTokServices(environment: TikTokEnvironment, db: PrismaClient) {
  const options = tiktokCredentials(environment);
  if (!options) return null;
  const client = new TikTokClient(options);
  const vault = new TokenVault(options.encryptionKey, 'tiktok');
  return {
    client,
    vault,
    tokens: new TikTokAccountTokens(db, client, vault),
    audited: options.audited,
    mediaOrigin: options.mediaOrigin,
    signingKey: options.encryptionKey,
  };
}
export type TikTokServices = NonNullable<ReturnType<typeof createTikTokServices>>;
