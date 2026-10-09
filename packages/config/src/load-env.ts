import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';

// npm workspace commands run from different directories. Locate the root consistently.
// Existing process environment variables always take precedence over .env.
export function loadEnvironment(startDirectory = process.cwd()): void {
  let directory = startDirectory;
  while (true) {
    if (existsSync(join(directory, 'package-lock.json'))) {
      config({ path: join(directory, '.env'), quiet: true });
      return;
    }
    const parent = dirname(directory);
    if (parent === directory) return;
    directory = parent;
  }
}
