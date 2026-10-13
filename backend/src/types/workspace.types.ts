import type { PrismaClient } from '../database/index.js';
import type { AccountTokens } from '../integrations/instagram/account-tokens.js';
import type { MediaStorage } from '../lib/media/storage.js';

export interface WorkspaceServices {
  database: PrismaClient;
  storage: MediaStorage;
  instagramConfigured: boolean;
  tokens?: AccountTokens;
}
