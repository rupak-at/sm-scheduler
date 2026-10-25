import type { PrismaClient } from '../../database/index.js';
import { youtubeCredentials } from '../../config/youtube.js';
import type { YouTubeEnvironment } from '../../config/youtube.js';
import { TokenVault } from '../instagram/token-crypto.js';
import { YouTubeClient } from './client.js';
import { YouTubeUploads } from './uploads.js';
import { YouTubeAccountTokens } from './account-tokens.js';

export function createYouTubeServices(environment: YouTubeEnvironment, db: PrismaClient) {
  const options = youtubeCredentials(environment);
  if (!options) return null;
  const client = new YouTubeClient(options);
  const vault = new TokenVault(options.encryptionKey, 'youtube');
  return {
    client,
    vault,
    uploads: new YouTubeUploads(),
    uploadVault: new TokenVault(options.encryptionKey, 'youtube-upload'),
    tokens: new YouTubeAccountTokens(db, client, vault),
  };
}
export type YouTubeServices = NonNullable<ReturnType<typeof createYouTubeServices>>;
