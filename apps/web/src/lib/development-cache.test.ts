import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { developmentCacheSettings } from '../../development-cache';

it('leaves production asset versions and cache policy to Next.js without reading development source', () => {
  expect(developmentCacheSettings('production', '/unavailable-source')).toEqual({});
});

it('versions changed development source and prevents browser/CDN storage', async () => {
  const source = await mkdtemp(join(tmpdir(), 'scheduler-dev-assets-'));
  try {
    await mkdir(join(source, 'planner'));
    const component = join(source, 'planner', 'editor.tsx');
    await writeFile(component, 'export const editor = "old";');
    const original = developmentCacheSettings('development', source);
    expect(developmentCacheSettings('development', source).deploymentId).toBe(
      original.deploymentId,
    );
    await writeFile(component, 'export const editor = "new";');
    const updated = developmentCacheSettings('development', source);
    expect(updated.deploymentId).not.toBe(original.deploymentId);
    const rules = await updated.headers?.();
    expect(rules).toHaveLength(1);
    expect(rules?.[0]?.source).toBe('/:path*');
    for (const name of ['Cache-Control', 'CDN-Cache-Control', 'Cloudflare-CDN-Cache-Control']) {
      expect(rules?.[0]?.headers.find((header) => header.key === name)?.value).toContain(
        'no-store',
      );
    }
  } finally {
    await rm(source, { recursive: true });
  }
});
