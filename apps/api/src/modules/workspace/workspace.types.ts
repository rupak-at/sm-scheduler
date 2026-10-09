import type { PrismaClient } from '@social-scheduler/database';
import type { AccountTokens, MediaStorage } from '@social-scheduler/publishing';

export interface WorkspaceServices {
  database: PrismaClient;
  storage: MediaStorage;
  instagramConfigured: boolean;
  tokens?: AccountTokens;
}
