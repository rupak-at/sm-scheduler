import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function projectPath(value: string): string {
  let directory = process.cwd();
  while (!existsSync(resolve(directory, 'package-lock.json'))) {
    const parent = dirname(directory);
    if (parent === directory) throw new Error('Project root unavailable');
    directory = parent;
  }
  return resolve(directory, value);
}
