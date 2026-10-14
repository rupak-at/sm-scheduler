import { z } from 'zod';

// Provider availability also requires configured credentials and each platform’s approval gates.
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
