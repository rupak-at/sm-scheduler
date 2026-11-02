import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse, UploadApiOptions, UploadResponseCallback } from 'cloudinary';
import { CloudinaryMediaStorage } from './storage.js';
import { LocalMediaStorage } from '../../lib/media/local-storage.js';

const environment = {
  CLOUDINARY_CLOUD_NAME: 'fixture-cloud',
  CLOUDINARY_API_KEY: '123456',
  CLOUDINARY_API_SECRET: 'secret-fixture-not-a-live-key',
  CLOUDINARY_FOLDER: 'scheduler/staging',
};
const id = 'ffe4e519-3886-44b2-b39e-0a67194b73e0';
const legacy = new LocalMediaStorage(
  '/tmp/unused-cloudinary-fixture',
  'fixture-signing-key',
  'https://media.example',
);
afterEach(() => vi.restoreAllMocks());

function uploadMock(failure = false, result: Partial<UploadApiResponse> | null = {}) {
  return vi
    .spyOn(cloudinary.uploader, 'upload_stream')
    .mockImplementation(
      (
        optionsOrCallback: UploadApiOptions | UploadResponseCallback | undefined,
        callback?: UploadResponseCallback,
      ) => {
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : undefined;
        const stream = new PassThrough();
        stream.on('finish', () =>
          callback?.(
            failure
              ? { message: 'raw-secret-provider-message', name: 'Error', http_code: 503 }
              : undefined,
            failure || result === null
              ? undefined
              : ({
                  public_id: options?.public_id,
                  type: 'authenticated',
                  resource_type: options?.resource_type,
                  format: options?.resource_type === 'video' ? 'mp4' : 'jpg',
                  ...result,
                } as UploadApiResponse),
          ),
        );
        return stream as ReturnType<typeof cloudinary.uploader.upload_stream>;
      },
    );
}

describe('Cloudinary protected media storage', () => {
  it('uploads normalized bytes as authenticated media with unique IDs and no overwrite', async () => {
    const upload = uploadMock();
    const storage = new CloudinaryMediaStorage(environment, legacy);
    expect(await storage.put(id, Buffer.from('prepared'), 'mp4')).toBe(
      `cloudinary:scheduler/staging/${id}.mp4`,
    );
    expect(upload.mock.calls[0]?.[0]).toMatchObject({
      public_id: `scheduler/staging/${id}`,
      resource_type: 'video',
      type: 'authenticated',
      overwrite: false,
      timeout: 120000,
    });
    expect(upload.mock.calls[0]?.[0]).not.toHaveProperty('folder');
  });
  it('signs expiring downloads using persisted identifiers and never includes the secret', () => {
    const storage = new CloudinaryMediaStorage(environment, legacy);
    const key = `cloudinary:old-folder/${id}.mp4`;
    const url = new URL(storage.publicMediaUrl(id, 'mp4', key));
    expect(url.origin).toBe('https://api.cloudinary.com');
    expect(url.pathname).toBe('/v1_1/fixture-cloud/video/download');
    expect(url.searchParams.get('public_id')).toBe(`old-folder/${id}`);
    expect(url.searchParams.get('type')).toBe('authenticated');
    expect(url.searchParams.get('signature')).toMatch(/^[0-9a-f]+$/);
    expect(Number(url.searchParams.get('expires_at'))).toBeGreaterThan(Date.now() / 1000 + 86390);
    expect(url.toString()).not.toContain(environment.CLOUDINARY_API_SECRET);
    expect(
      Number(new URL(storage.previewUrl(id, 'mp4', key)!).searchParams.get('expires_at')),
    ).toBeLessThan(Date.now() / 1000 + 3610);
    expect(() => storage.publicMediaUrl(id, 'jpg', 'cloudinary:unowned/file.jpg')).toThrow(
      'Invalid media storage key',
    );
  });
  it('keeps legacy reads available and refuses new uploads when Cloudinary is unconfigured', async () => {
    const storage = new CloudinaryMediaStorage({ CLOUDINARY_FOLDER: 'scheduler' }, legacy);
    expect(storage.previewUrl(id, 'jpg', `${id}.jpg`)).toBeUndefined();
    expect(storage.publicMediaUrl(id, 'jpg', `${id}.jpg`)).toBe(legacy.publicMediaUrl(id));
    await expect(storage.put(id, Buffer.from('prepared'), 'jpg')).rejects.toMatchObject({
      status: 503,
    });
  });
  it('maps failed uploads to safe errors without storing provider messages', async () => {
    uploadMock(true);
    const storage = new CloudinaryMediaStorage(environment, legacy);
    await expect(storage.put(id, Buffer.from('prepared'), 'jpg')).rejects.toThrow(
      'Cloudinary upload failed (HTTP 503)',
    );
  });
});

describe('Cloudinary upload confirmation and cleanup', () => {
  it.each(['public_id', 'type', 'resource_type', 'format'] as const)(
    'rejects mismatched %s confirmations without exposing the returned value',
    async (field) => {
      uploadMock(false, { [field]: 'secret-provider-value' });
      const storage = new CloudinaryMediaStorage(environment, legacy);
      await expect(storage.put(id, Buffer.from('prepared'), 'mp4')).rejects.toThrow(
        `Cloudinary upload confirmation did not match ${field}.`,
      );
    },
  );
  it('distinguishes a missing response from a provider rejection', async () => {
    uploadMock(false, null);
    const storage = new CloudinaryMediaStorage(environment, legacy);
    await expect(storage.put(id, Buffer.from('prepared'), 'mp4')).rejects.toThrow(
      'Cloudinary returned no upload confirmation.',
    );
  });
  it('reports transport codes emitted by the upload stream safely', async () => {
    vi.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation(() => {
      const stream = new PassThrough();
      stream.on('finish', () => {
        stream.emit(
          'error',
          Object.assign(new Error('secret-provider-message'), { code: 'EPIPE' }),
        );
      });
      return stream as ReturnType<typeof cloudinary.uploader.upload_stream>;
    });
    const storage = new CloudinaryMediaStorage(environment, legacy);
    await expect(storage.put(id, Buffer.from('prepared'), 'mp4')).rejects.toThrow(
      "Cloudinary upload connection failed (EPIPE). Check the API server's network connection.",
    );
  });
  it('removes the matching image/video when persistence fails', async () => {
    const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
    await new CloudinaryMediaStorage(environment, legacy).remove(id, 'mp4');
    expect(destroy.mock.calls[0]?.[0]).toBe(`scheduler/staging/${id}`);
    expect(destroy.mock.calls[0]?.[1]).toMatchObject({
      resource_type: 'video',
      type: 'authenticated',
    });
  });
});
