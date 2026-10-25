import sharp from 'sharp';
import { z } from 'zod';
import { mediaUploadTicketSchema, mediaUploadSchema } from '@social-scheduler/shared';
import type { createLoadFixture } from './fixture.js';
import { origin } from './fixture.js';
import { measure } from './measure.js';
import type { Measurement } from './measure.js';

export async function exerciseUploads(
  fixture: Awaited<ReturnType<typeof createLoadFixture>>,
  results: Measurement[],
) {
  const photo = await sharp({
    create: { width: 320, height: 400, channels: 3, background: '#ddd' },
  })
    .jpeg()
    .toBuffer();
  const tickets: { id: string; token: string }[] = [];
  results.push(
    await measure('upload-ticket', 1000, async (i) => {
      const response = await fetch(`${fixture.base}/api/workspace/media/ticket`, {
        method: 'POST',
        headers: {
          Cookie: fixture.users[i]!.cookie,
          Origin: origin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mimeType: 'image/jpeg', sizeBytes: photo.length }),
        signal: AbortSignal.timeout(60000),
      });
      const body = z.record(z.string(), z.unknown()).parse(await response.json());
      if (response.status === 201) tickets[i] = mediaUploadTicketSchema.parse(body);
      return {
        status: response.status,
        valid: response.status === 201 && typeof body.token === 'string',
      };
    }),
  );
  results.push(
    await measure('direct-photo-upload', 1000, async (i) => {
      const response = await fetch(`${fixture.base}/api/media/upload/${tickets[i]?.id}`, {
        method: 'POST',
        headers: {
          Origin: origin,
          Authorization: `Bearer ${tickets[i]?.token}`,
          'Content-Type': 'image/jpeg',
        },
        body: new Uint8Array(photo),
        signal: AbortSignal.timeout(60000),
      });
      const body = z.record(z.string(), z.unknown()).parse(await response.json());
      if (response.status === 201) fixture.users[i]!.mediaId = mediaUploadSchema.parse(body).id;
      return {
        status: response.status,
        valid:
          response.status === 201 && body.mimeType === 'image/jpeg' && body.id === tickets[i]?.id,
      };
    }),
  );
}
