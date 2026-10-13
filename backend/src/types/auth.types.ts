import type { AuthenticatedUser } from '@social-scheduler/shared';
import type { RequestHandler } from 'express';

export interface AuthGateway {
  handler: RequestHandler;
  getSession: (headers: Headers) => Promise<{ user: AuthenticatedUser } | null>;
}
