import { describe, expect, it, vi } from 'vitest';
import { createSystemCheckProcessor } from './system-check.js';

describe('infrastructure check processor', () => {
  it('rejects invalid payloads before touching the database', async () => {
    const check = vi.fn();
    await expect(
      createSystemCheckProcessor(check)({ data: { publicationId: 'wrong-queue' } }),
    ).rejects.toThrow();
    expect(check).not.toHaveBeenCalled();
  });

  it('lets database failures reach BullMQ instead of returning false success', async () => {
    const processor = createSystemCheckProcessor(async () => {
      throw new Error('Database unavailable');
    });
    await expect(processor({ data: { requestedAt: new Date().toISOString() } })).rejects.toThrow(
      'Database unavailable',
    );
  });
});
