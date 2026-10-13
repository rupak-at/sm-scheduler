import { createHash, type Hash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

function hashDirectory(directory: string, hash: Hash) {
  const entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name, 'en'),
  );
  for (const entry of entries) {
    hash.update(entry.name);
    const path = join(directory, entry.name);
    if (entry.isDirectory()) hashDirectory(path, hash);
    else if (entry.isFile()) hash.update(readFileSync(path));
  }
}

export function developmentCacheSettings(
  environment: string | undefined = process.env.NODE_ENV,
  sourceDirectory: string = fileURLToPath(new URL('./src', import.meta.url)),
): Pick<NextConfig, 'deploymentId' | 'headers'> {
  if (environment !== 'development') return {};
  const hash = createHash('sha256');
  hashDirectory(sourceDirectory, hash);
  return {
    // Stable across config evaluations; changed source gets fresh browser/CDN asset URLs.
    deploymentId: `development-${hash.digest('hex').slice(0, 16)}`,
    headers: async () => [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Cloudflare-CDN-Cache-Control', value: 'no-store' },
        ],
      },
    ],
  };
}
