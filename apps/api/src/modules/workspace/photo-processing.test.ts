import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { preparePhoto } from './photo-processing.js';

describe('Supported still photo uploads', () => {
  it.each(['png', 'webp', 'avif'] as const)(
    'converts %s bytes to a supported JPEG',
    async (format) => {
      const bytes = await sharp({
        create: {
          width: 800,
          height: 1000,
          channels: 4,
          background: { r: 10, g: 30, b: 100, alpha: 0 },
        },
      })
        .toFormat(format)
        .toBuffer();
      const prepared = await preparePhoto(bytes, `image/${format}`);
      const metadata = await sharp(prepared.bytes).metadata();
      expect(prepared).toMatchObject({
        type: 'IMAGE',
        mimeType: 'image/jpeg',
        extension: 'jpg',
        width: 800,
        height: 1000,
      });
      expect(metadata.format).toBe('jpeg');
      const pixel = await sharp(prepared.bytes)
        .extract({ left: 0, top: 0, width: 1, height: 1 })
        .raw()
        .toBuffer();
      expect([...pixel]).toEqual([255, 255, 255]);
    },
  );
  it('keeps the whole image and pads a common phone-photo aspect ratio', async () => {
    const bytes = await sharp({
      create: { width: 600, height: 800, channels: 3, background: '#27272a' },
    })
      .png()
      .toBuffer();
    const prepared = await preparePhoto(bytes, 'image/png');
    expect(prepared.width).toBe(640);
    expect(prepared.height).toBe(800);
    expect(prepared.width / prepared.height).toBe(0.8);
  });
  it('rotates before sizing and strips original metadata', async () => {
    const bytes = await sharp({
      create: { width: 1000, height: 800, channels: 3, background: '#27272a' },
    })
      .jpeg()
      .withMetadata({ orientation: 6, exif: { IFD0: { Artist: 'private-creator' } } })
      .toBuffer();
    const prepared = await preparePhoto(bytes, 'image/jpeg');
    const metadata = await sharp(prepared.bytes).metadata();
    expect([prepared.width, prepared.height]).toEqual([800, 1000]);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
  });
});

describe('Photo trust boundaries', () => {
  it('rejects disguised formats, unreadable data, and undersized photos', async () => {
    const png = await sharp({
      create: { width: 400, height: 400, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    await expect(preparePhoto(png, 'image/jpeg')).rejects.toMatchObject({ status: 422 });
    await expect(
      preparePhoto(Buffer.from('<svg><image href="file:///private" /></svg>'), 'image/png'),
    ).rejects.toMatchObject({ status: 422 });
    await expect(preparePhoto(Buffer.from('invalid'), 'image/jpeg')).rejects.toMatchObject({
      status: 422,
    });
    const small = await sharp({
      create: { width: 100, height: 100, channels: 3, background: '#ffffff' },
    })
      .jpeg()
      .toBuffer();
    await expect(preparePhoto(small, 'image/jpeg')).rejects.toMatchObject({ status: 422 });
  });
  it('enforces the original photo size limit before decoding', async () => {
    await expect(
      preparePhoto(Buffer.alloc(8 * 1024 * 1024 + 1), 'image/png'),
    ).rejects.toMatchObject({ status: 413 });
  });
});
