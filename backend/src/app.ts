import type { WorkspaceServices } from './types/workspace.types.js';
import { workspaceRouter } from './routes/workspace.routes.js';
import { publicMediaRouter } from './routes/media.routes.js';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { createHealthRouter } from './routes/health.routes.js';
import type { HealthChecks } from './services/health.service.js';
import type { AuthGateway } from './types/auth.types.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createAuthHandler } from './controllers/auth.handler.js';

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
