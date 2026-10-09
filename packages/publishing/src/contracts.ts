import type { Platform } from '@social-scheduler/shared';

export interface PublicationInput {
  publicationId: string;
  accountId: string;
  caption: string;
  media: readonly { url: string; mimeType: string }[];
}

export interface ValidationResult {
  valid: boolean;
  issues: readonly { code: string; message: string }[];
}

export type PublishResult =
  | { outcome: 'published'; externalPostId: string }
  | { outcome: 'processing'; externalContainerId: string }
  | { outcome: 'failed'; code: string; retryable: boolean }
  | { outcome: 'uncertain'; externalContainerId?: string };

export interface SocialPublisher {
  readonly platform: Platform;
  validate(input: PublicationInput): Promise<ValidationResult>;
  publish(input: PublicationInput): Promise<PublishResult>;
  getStatus?(externalId: string): Promise<PublishResult>;
}
