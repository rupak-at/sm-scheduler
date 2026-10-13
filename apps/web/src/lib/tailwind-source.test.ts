import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { expect, it } from 'vitest';

it('generates responsive planner utilities independently of the compiler working directory', async () => {
  const base = await mkdtemp(join(tmpdir(), 'scheduler-css-source-'));
  const from = fileURLToPath(new URL('../app/globals.css', import.meta.url));
  const input = await readFile(from, 'utf8');
  try {
    const missingSource = await postcss([tailwind({ base, optimize: false })]).process(
      input.replace(" source('../')", ''),
      { from },
    );
    expect(missingSource.css).not.toContain('.lg\\:grid-cols-');
    const result = await postcss([tailwind({ base, optimize: false })]).process(input, { from });
    expect(result.css).toContain('.grid-cols-1');
    expect(result.css).toContain('.lg\\:grid-cols-');
    expect(result.css).toContain('.lg\\:px-10');
    expect(result.css).toContain('.line-clamp-3');
  } finally {
    await rm(base, { recursive: true });
  }
});
