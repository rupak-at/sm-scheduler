import { z } from 'zod';

// Future provider names describe the data model, not enabled product features.
export const platformSchema = z.enum(['INSTAGRAM', 'FACEBOOK', 'TIKTOK']);
export type Platform = z.infer<typeof platformSchema>;

export const publicationStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'PROCESSING',
  'PUBLISHED',
  'FAILED',
  'CANCELLED',
  'UNCERTAIN',
]);
export type PublicationStatus = z.infer<typeof publicationStatusSchema>;
