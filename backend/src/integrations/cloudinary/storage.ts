import { v2 as cloudinary } from 'cloudinary';
import type { CloudinaryEnvironment } from '../../config/cloudinary.js';
import { cloudinaryCredentials } from '../../config/cloudinary.js';
import type { MediaExtension, MediaStorage } from '../../lib/media/media-storage.types.js';
import type { LocalMediaStorage } from '../../lib/media/local-storage.js';
import { WorkspaceError } from '../../lib/workspace-error.js';

export class CloudinaryMediaStorage implements MediaStorage {
  private readonly credentials;
  constructor(
    environment: CloudinaryEnvironment,
    private readonly legacy: LocalMediaStorage,
  ) {
    this.credentials = cloudinaryCredentials(environment);
  }
  async put(id: string, bytes: Buffer, extension: MediaExtension): Promise<string> {
    const options = this.uploadOptions(id, extension);
    await new Promise<void>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (
          error ||
          !result ||
          result.public_id !== options.public_id ||
          result.type !== 'authenticated' ||
          result.resource_type !== options.resource_type ||
          result.format !== extension
        ) {
          reject(
            new WorkspaceError(503, 'Cloudinary could not confirm the media upload. Try again.'),
          );
        } else resolve();
      });
      stream.on('error', () =>
        reject(new WorkspaceError(503, 'Cloudinary upload unavailable. Try again.')),
      );
      stream.end(bytes);
    });
    return `cloudinary:${options.public_id}.${extension}`;
  }
  async remove(id: string, extension: MediaExtension): Promise<void> {
    const options = this.uploadOptions(id, extension);
    try {
      await cloudinary.uploader.destroy(options.public_id, options);
    } catch {
      throw new WorkspaceError(503, 'Cloudinary cleanup unavailable.');
    }
  }
  read(id: string, extension: MediaExtension) {
    return this.legacy.read(id, extension);
  }
  authorized(id: string, expires: number, signature: string): boolean {
    return this.legacy.authorized(id, expires, signature);
  }
  previewUrl(id: string, extension: MediaExtension, storageKey: string): string | undefined {
    return storageKey.startsWith('cloudinary:')
      ? this.downloadUrl(id, extension, storageKey, 3600)
      : undefined;
  }
  publicMediaUrl(id: string, extension: MediaExtension = 'jpg', storageKey?: string): string {
    if (storageKey && !storageKey.startsWith('cloudinary:')) return this.legacy.publicMediaUrl(id);
    return this.downloadUrl(id, extension, storageKey, 86400);
  }
  private uploadOptions(id: string, extension: MediaExtension) {
    if (!this.credentials)
      throw new WorkspaceError(503, 'Configure Cloudinary before uploading media.');
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Invalid media identifier');
    const { folder, ...credentials } = this.credentials;
    return {
      ...credentials,
      public_id: `${folder}/${id}`,
      resource_type: extension === 'mp4' ? ('video' as const) : ('image' as const),
      type: 'authenticated',
      overwrite: false,
      timeout: 120000,
    };
  }
  private downloadUrl(
    id: string,
    extension: MediaExtension,
    storageKey: string | undefined,
    ttl: number,
  ): string {
    const options = this.uploadOptions(id, extension);
    // Persisted identifiers survive folder configuration changes. Never accept a client-provided URL.
    const publicId = storageKey
      ? storageKey.slice('cloudinary:'.length, -(extension.length + 1))
      : options.public_id;
    if (!publicId.endsWith(`/${id}`) || !/^[a-zA-Z0-9_/-]+$/.test(publicId))
      throw new Error('Invalid media storage key');
    return cloudinary.utils.private_download_url(publicId, extension, {
      ...options,
      attachment: false,
      expires_at: Math.floor(Date.now() / 1000) + ttl,
    });
  }
}
