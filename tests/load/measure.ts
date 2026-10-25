import { performance } from 'node:perf_hooks';

export interface Sample {
  status: number;
  valid: boolean;
}
export interface Measurement {
  name: string;
  concurrentUsers: number;
  requests: number;
  elapsedMs: number;
  requestsPerSecond: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  statuses: Record<string, number>;
  failures: number;
}

// Every virtual user starts without a concurrency cap or think time.
export async function measure(
  name: string,
  users: number,
  action: (index: number) => Promise<Sample>,
): Promise<Measurement> {
  const started = performance.now();
  const durations: number[] = [];
  const statuses: Record<string, number> = {};
  let failures = 0;
  await Promise.all(
    Array.from({ length: users }, async (_, index) => {
      const start = performance.now();
      let sample: Sample;
      try {
        sample = await action(index);
      } catch {
        sample = { status: 0, valid: false };
      }
      durations.push(performance.now() - start);
      statuses[sample.status] = (statuses[sample.status] ?? 0) + 1;
      if (!sample.valid) failures++;
    }),
  );
  durations.sort((a, b) => a - b);
  const elapsedMs = Math.round(performance.now() - started);
  const percentile = (p: number) => Math.round(durations[Math.ceil(p * users) - 1] ?? 0);
  return {
    name,
    concurrentUsers: users,
    requests: users,
    elapsedMs,
    requestsPerSecond: Math.round(users / (elapsedMs / 1000)),
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
    statuses,
    failures,
  };
}
