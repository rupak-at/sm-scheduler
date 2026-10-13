import type { CloudinaryEnvironment } from './cloudinary.js';
import type { InstagramEnvironment } from './instagram.js';
import { projectPath } from './project-path.js';
import { LocalMediaStorage } from '../lib/media/local-storage.js';
import { CloudinaryMediaStorage } from '../integrations/cloudinary/storage.js';

export function createMediaStorage(
  environment: CloudinaryEnvironment & InstagramEnvironment,
  signingKey: string,
) {
  const legacy = new LocalMediaStorage(
    projectPath(environment.MEDIA_STORAGE_PATH),
    signingKey,
    environment.MEDIA_PUBLIC_URL,
  );
  return new CloudinaryMediaStorage(environment, legacy);
}
