import { z } from 'zod';

export const SYSTEM_CHECK_QUEUE = 'system-checks';
export const systemCheckJobSchema = z.object({ requestedAt: z.iso.datetime() }).strict();

// Publishing jobs carry IDs only; fetch current state from PostgreSQL when processing.
export const publicationJobSchema = z.object({ publicationId: z.uuid() }).strict();
export type PublicationJob = z.infer<typeof publicationJobSchema>;
