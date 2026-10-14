import { z } from 'zod';

// TikTok describes the data model only; enabled scheduling providers are Instagram and Facebook.
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
