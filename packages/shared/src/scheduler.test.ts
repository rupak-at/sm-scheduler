import { expect, it } from 'vitest';
import { postInputSchema } from './scheduler.js';
it('rejects invalid timezone, caption length, and ambiguous scheduling instants', () => {
  const input = {
    caption: '',
    mediaAssetId: 'ffe4e519-3886-44b2-b39e-0a67194b73e0',
    socialAccountId: 'ffe4e519-3886-44b2-b39e-0a67194b73e1',
    timezone: 'Asia/Kathmandu',
    scheduledAt: null,
  };
  expect(postInputSchema.safeParse(input).success).toBe(true);
  for (const change of [
    { timezone: 'Mars/Test' },
    { caption: 'a'.repeat(2201) },
    { scheduledAt: '2026-10-09T10:00' },
  ])
    expect(postInputSchema.safeParse({ ...input, ...change }).success).toBe(false);
});
