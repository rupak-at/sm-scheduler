import type { PrismaClient } from '../database/index.js';
import type { AccountTokens } from '../integrations/instagram/account-tokens.js';
import type { MediaStorage } from '../lib/media/media-storage.types.js';
import type { FacebookAccountTokens } from '../integrations/facebook/account-tokens.js';

export interface WorkspaceServices {
  database: PrismaClient;
  storage: MediaStorage;
  uploads: { signingKey: string; apiOrigin: string; webOrigin: string };
  instagramConfigured: boolean;
  facebookConfigured?: boolean;
  tokens?: AccountTokens;
  facebookTokens?: FacebookAccountTokens;
}
