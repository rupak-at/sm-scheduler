import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createLoadFixture } from '../load/fixture.js';
import type { LoadProvider } from '../load/fixture.js';

export const webOrigin = 'http://localhost:3159';
export async function createBrowserFixture(provider: LoadProvider = 'INSTAGRAM') {
  const api = await createLoadFixture(0, webOrigin, provider);
  await api.db.rateLimit.deleteMany();
  const web = spawn(
    process.execPath,
    ['../node_modules/next/dist/bin/next', 'start', '--port', '3159'],
    {
      cwd: new URL('../../frontend', import.meta.url),
      env: { ...process.env, API_BASE_URL: api.base, NEXT_TELEMETRY_DISABLED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  // Drain output; never copy environment or upstream response bodies into reports.
  web.stdout.resume();
  web.stderr.resume();
  try {
    await waitForWeb(web);
    const browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    return {
      ...api,
      browser,
      close: async () => {
        await browser.close();
        const exited = once(web, 'exit');
        web.kill('SIGTERM');
        await exited;
        await api.close();
      },
    };
  } catch (error) {
    web.kill('SIGTERM');
    await api.close();
    throw error;
  }
}

async function waitForWeb(web: ChildProcess) {
  // Wait for our child's readiness, never for an arbitrary server already using
  // this port: sending a signup to someone else's running app is unsafe.
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => finish(new Error('Isolated frontend startup timed out; run npm run build first')),
      15000,
    );
    let output = '';
    const ready = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-2000);
      if (output.includes('Ready in')) finish();
    };
    const failed = () =>
      finish(new Error('Isolated frontend failed to start; port 3159 must be free'));
    function finish(error?: Error) {
      clearTimeout(timer);
      web.stdout?.off('data', ready);
      web.off('exit', failed);
      web.off('error', failed);
      if (error) reject(error);
      else resolve();
    }
    web.stdout?.on('data', ready);
    web.once('exit', failed);
    web.once('error', failed);
  });
}
