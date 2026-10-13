import { createApp } from './app.js';
import { getApiEnvironment } from './config/environment.js';
import { createResources } from './config/resources.js';

const environment = getApiEnvironment();
const resources = createResources(environment);
const app = createApp({
  webOrigin: environment.WEB_ORIGIN,
  checks: resources.checks,
  auth: resources.auth,
  workspace: resources.workspace,
});

const server = app.listen(environment.API_PORT, () => {
  resources.logger.info({ port: environment.API_PORT }, 'API listening');
});
server.on('error', async () => {
  resources.logger.error('API could not start; check port availability');
  await resources.close();
  process.exitCode = 1;
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  resources.logger.info('Stopping API');
  const deadline = setTimeout(() => process.exit(1), 10000).unref();
  server.close(() => {
    void resources.close().then(
      () => clearTimeout(deadline),
      () => process.exit(1),
    );
  });
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
