import type { PrismaClient } from '../../database/index.js';
import { facebookCredentials } from '../../config/facebook.js';
import type { FacebookEnvironment } from '../../config/facebook.js';
import { TokenVault } from '../instagram/token-crypto.js';
import { FacebookClient } from './client.js';
import { FacebookAccountTokens } from './account-tokens.js';

export function createFacebookServices(environment: FacebookEnvironment, database: PrismaClient) {
  const credentials = facebookCredentials(environment);
  if (!credentials) return null;
  const client = new FacebookClient(credentials);
  const vault = new TokenVault(credentials.encryptionKey, 'facebook');
  return { client, vault, tokens: new FacebookAccountTokens(database, client, vault) };
}
