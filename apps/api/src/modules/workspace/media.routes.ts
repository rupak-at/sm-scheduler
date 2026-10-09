import { randomUUID } from 'node:crypto';
import express, { Router } from 'express';
import sharp from 'sharp';
import type { Metadata } from 'sharp';
import { z } from 'zod';
import { WorkspaceError } from './errors.js';
import type { WorkspaceServices } from './workspace.types.js';

export function publicMediaRouter({ database, storage }: WorkspaceServices) {
  const router = Router();
  router.get('/:id', async (request, response) => {
    const id = z.uuid().parse(request.params.id);
    const expires = Number(request.query.expires);
    const signature = typeof request.query.signature === 'string' ? request.query.signature : '';
    if (!storage.authorized(id, expires, signature))
      throw new WorkspaceError(403, 'Media link expired.');
    if (!(await database.mediaAsset.findFirst({ where: { id, status: 'READY' } })))
      throw new WorkspaceError(404, 'Photo not found.');
    response
      .set('Cache-Control', 'private, max-age=300')
      .type('image/jpeg')
      .send(await storage.read(id));
  });
  return router;
}
export function mediaRouter({ database, storage }: WorkspaceServices) {
  const router = Router();
  router.post(
    '/media',
    express.raw({ type: 'image/jpeg', limit: '8mb' }),
    async (request, response) => {
      if (!Buffer.isBuffer(request.body) || !request.body.length)
        throw new WorkspaceError(422, 'Upload a JPEG photo, up to 8 MB.');
      let bytes: Buffer;
      let dimensions: Metadata;
      try {
        const input = sharp(request.body, { limitInputPixels: 40000000 });
        const metadata = await input.metadata();
        if (metadata.format !== 'jpeg' || !metadata.width || !metadata.height)
          throw new Error('JPEG required');
        bytes = await input
          .rotate()
          .resize({ width: 1440, withoutEnlargement: true })
          .jpeg({ quality: 90 })
          .toBuffer();
        dimensions = await sharp(bytes).metadata();
      } catch {
        throw new WorkspaceError(422, 'This photo could not be read. Upload a valid JPEG.');
      }
      const width = dimensions.width ?? 0,
        height = dimensions.height ?? 0;
      if (width < 320 || width / height < 0.8 || width / height > 1.91)
        throw new WorkspaceError(
          422,
          'Use a photo at least 320 px wide, with an aspect ratio from 4:5 to 1.91:1.',
        );
      const id = randomUUID();
      await storage.put(id, bytes);
      try {
        await database.mediaAsset.create({
          data: {
            id,
            userId: response.locals.userId,
            storageKey: `${id}.jpg`,
            mimeType: 'image/jpeg',
            type: 'IMAGE',
            status: 'READY',
            sizeBytes: BigInt(bytes.length),
            width,
            height,
          },
        });
      } catch (error) {
        await storage.remove(id);
        throw error;
      }
      response.status(201).json({ id, url: `/api/workspace/media/${id}` });
    },
  );
  router.get('/media/:id', async (request, response) => {
    const id = z.uuid().parse(request.params.id);
    if (
      !(await database.mediaAsset.findFirst({
        where: { id, userId: response.locals.userId, status: 'READY' },
      }))
    )
      throw new WorkspaceError(404, 'Photo not found.');
    response
      .set('Cache-Control', 'private, max-age=300')
      .type('image/jpeg')
      .send(await storage.read(id));
  });
  return router;
}
