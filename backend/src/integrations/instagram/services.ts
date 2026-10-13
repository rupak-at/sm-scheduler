import type { PrismaClient } from '../../database/index.js';
import { instagramCredentials } from '../../config/instagram.js';
import type { InstagramEnvironment } from '../../config/instagram.js';
import { InstagramClient } from './client.js';
import { TokenVault } from './token-crypto.js';
import { AccountTokens } from './account-tokens.js';

export function createInstagramServices(environment: InstagramEnvironment, database: PrismaClient) {
  const credentials = instagramCredentials(environment);
  if (!credentials) return null;
  const client = new InstagramClient(credentials);
  const vault = new TokenVault(credentials.encryptionKey);
  return { client, vault, tokens: new AccountTokens(database, client, vault) };
}
