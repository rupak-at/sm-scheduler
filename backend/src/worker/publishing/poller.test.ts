import { afterEach, expect, it, vi } from 'vitest';
import { startPoller } from './poller.js';
afterEach(() => vi.useRealTimers());
it('prevents overlapping scans and waits for the active task during shutdown', async () => {
  vi.useFakeTimers();
  let release: () => void = () => {};
  const task = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const stop = startPoller(task, 100, vi.fn());
  await vi.advanceTimersByTimeAsync(500);
  expect(task).toHaveBeenCalledTimes(1);
  let closed = false;
  const closing = stop().then(() => {
    closed = true;
  });
  await Promise.resolve();
  expect(closed).toBe(false);
  release();
  await closing;
  await vi.advanceTimersByTimeAsync(500);
  expect(task).toHaveBeenCalledTimes(1);
});
it('reports errors and allows the next scan to recover', async () => {
  vi.useFakeTimers();
  const task = vi
    .fn<() => Promise<void>>()
    .mockRejectedValueOnce(new Error('unavailable'))
    .mockResolvedValue(undefined);
  const error = vi.fn();
  const stop = startPoller(task, 100, error);
  await vi.advanceTimersByTimeAsync(100);
  expect(error).toHaveBeenCalledTimes(1);
  expect(task).toHaveBeenCalledTimes(2);
  await stop();
});
