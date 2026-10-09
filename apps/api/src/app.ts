import type { WorkspaceServices } from './modules/workspace/workspace.types.js';
import { workspaceRouter } from './modules/workspace/workspace.routes.js';
import { publicMediaRouter } from './modules/workspace/media.routes.js';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import type { HealthChecks } from './modules/health/health.service.js';
import type { AuthGateway } from './modules/auth/auth.types.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAuthHandler } from './modules/auth/auth.handler.js';

export interface AppDependencies {
  webOrigin: string;
  checks: HealthChecks;
  auth?: AuthGateway;
  workspace?: WorkspaceServices;
}

export function createApp({ webOrigin, checks, auth, workspace }: AppDependencies) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: webOrigin }));
  // Better Auth must receive the original request stream before JSON body parsing.
  if (auth) app.all('/api/auth/*splat', createAuthHandler(auth, webOrigin));
  app.use(express.json({ limit: '100kb' }));
  if (workspace && auth) {
    app.use('/api/media/public', publicMediaRouter(workspace));
    app.use('/api/workspace', workspaceRouter(workspace, auth, webOrigin));
  }
  app.use('/health', createHealthRouter(checks));
  if (auth) app.use('/api', createAuthRouter(auth));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
