export type MediaExtension = 'jpg' | 'mp4';

export interface MediaStorage {
  put(id: string, bytes: Buffer, extension: MediaExtension): Promise<string>;
  read(id: string, extension: MediaExtension): Promise<Buffer>;
  remove(id: string, extension: MediaExtension): Promise<void>;
  publicMediaUrl(id: string, extension?: MediaExtension, storageKey?: string): string;
  authorized(id: string, expires: number, signature: string): boolean;
  previewUrl?(id: string, extension: MediaExtension, storageKey: string): string | undefined;
}
