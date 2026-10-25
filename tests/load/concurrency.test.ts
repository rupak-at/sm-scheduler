import { writeFile } from 'node:fs/promises';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { cpus, totalmem } from 'node:os';
import { expect, it, vi } from 'vitest';
import * as errors from '../../backend/src/middleware/error-handler.js';
import type { PlannerPost, PostInput } from '@social-scheduler/shared';
import { workspaceSchema, postSchema } from '@social-scheduler/shared';
import { z } from 'zod';
import { createLoadFixture, origin } from './fixture.js';
import { measure } from './measure.js';
import type { Measurement } from './measure.js';
import { exerciseUploads } from './uploads.js';

it('serves 1,000 independent authenticated users and preserves write isolation', async () => {
  const internalErrors: Record<string, number> = {};
  const handler = errors.errorHandler;
  vi.spyOn(errors, 'errorHandler').mockImplementation((error, request, response, next) => {
    const key =
      error instanceof Error && 'code' in error ? String(error.code) : error.constructor.name;
    internalErrors[key] = (internalErrors[key] ?? 0) + 1;
    handler(error, request, response, next);
  });
  const fixture = await createLoadFixture(1000);
  const results: Measurement[] = [];
  const delay = monitorEventLoopDelay({ resolution: 20 });
  delay.enable();
  try {
    await exercise(fixture, results);
  } finally {
    delay.disable();
    const report = {
      timestamp: new Date().toISOString(),
      node: process.version,
      cpus: cpus().length,
      totalMemoryMiB: Math.round(totalmem() / 1024 ** 2),
      peakRssMiB: Math.round(process.resourceUsage().maxRSS / 1024),
      eventLoopP99Ms: Math.round(delay.percentile(99) / 1e6),
      results,
      internalErrors,
    };
    await writeFile(
      process.env.LOAD_REPORT_PATH ?? '/tmp/scheduler-load-results.json',
      JSON.stringify(report, null, 2) + '\n',
    );
    await fixture.close();
    vi.restoreAllMocks();
  }
  expect(
    results.filter((result) => result.failures),
    JSON.stringify(results, null, 2),
  ).toEqual([]);
});

async function exercise(
  fixture: Awaited<ReturnType<typeof createLoadFixture>>,
  results: Measurement[],
) {
  const posts: (PlannerPost | undefined)[] = [];
  async function send(index: number, path: string, method = 'GET', body?: unknown) {
    const response = await fetch(`${fixture.base}${path}`, {
      method,
      headers: {
        Cookie: fixture.users[index]!.cookie,
        Origin: origin,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(60000),
    });
    return {
      status: response.status,
      body: z.record(z.string(), z.unknown()).parse(await response.json()),
    };
  }
  const payload = (i: number) => ({
    caption: `Load user ${i}`,
    mediaAssetId: fixture.users[i]!.mediaId,
    socialAccountId: fixture.users[i]!.channelId,
    scheduledAt: null,
    timezone: 'Asia/Kathmandu',
  });
  await exerciseReads(fixture, results, send);
  await exerciseUploads(fixture, results);
  results.push(
    await measure('create-draft', 1000, async (i) => {
      const result = await send(i, '/api/workspace/posts', 'POST', payload(i));
      if (result.status === 201) posts[i] = postSchema.parse(result.body);
      return {
        status: result.status,
        valid: result.status === 201 && result.body.caption === `Load user ${i}`,
      };
    }),
  );
  await exerciseMutations(fixture, results, posts, send, payload);
}

type Send = (
  index: number,
  path: string,
  method?: string,
  body?: unknown,
) => Promise<{ status: number; body: Record<string, unknown> }>;
async function exerciseReads(
  fixture: Awaited<ReturnType<typeof createLoadFixture>>,
  results: Measurement[],
  send: Send,
) {
  results.push(
    await measure('session-check', 1000, async (i) => {
      const result = await send(i, '/api/auth/get-session');
      return {
        status: result.status,
        valid:
          result.status === 200 &&
          typeof result.body.user === 'object' &&
          result.body.user !== null &&
          'id' in result.body.user &&
          result.body.user.id === fixture.users[i]!.id,
      };
    }),
  );
  results.push(
    await measure('workspace-read', 1000, async (i) => {
      const result = await send(i, '/api/workspace');
      const parsed = workspaceSchema.safeParse(result.body);
      return {
        status: result.status,
        valid:
          result.status === 200 &&
          parsed.success &&
          parsed.data.channels[0]?.id === fixture.users[i]!.channelId,
      };
    }),
  );
}

async function exerciseMutations(
  fixture: Awaited<ReturnType<typeof createLoadFixture>>,
  results: Measurement[],
  posts: (PlannerPost | undefined)[],
  send: Send,
  payload: (i: number) => PostInput,
) {
  results.push(
    await measure('schedule-post', 1000, async (i) => {
      const result = await send(i, `/api/workspace/posts/${posts[i]?.id}`, 'PUT', {
        ...payload(i),
        revision: posts[i]?.updatedAt,
        scheduledAt: new Date(Date.now() + 300000).toISOString(),
      });
      return {
        status: result.status,
        valid: result.status === 200 && result.body.status === 'SCHEDULED',
      };
    }),
  );
  results.push(
    await measure('workspace-read-populated', 1000, async (i) => {
      const result = await send(i, '/api/workspace?view=scheduled');
      const parsed = workspaceSchema.safeParse(result.body);
      return {
        status: result.status,
        valid:
          result.status === 200 &&
          parsed.success &&
          parsed.data.posts.length === 1 &&
          parsed.data.posts[0]?.id === posts[i]?.id &&
          parsed.data.counts.scheduled === 1 &&
          parsed.data.upcoming[0]?.id === posts[i]?.id,
      };
    }),
  );
  results.push(
    await measure('cross-user-edit', 1000, async (i) => {
      const result = await send(i, `/api/workspace/posts/${posts[(i + 1) % 1000]?.id}`, 'PUT', {
        ...payload(i),
        revision: posts[i]?.updatedAt,
      });
      return { status: result.status, valid: result.status === 404 };
    }),
  );
  results.push(
    await measure('cancel-post', 1000, async (i) => {
      const result = await send(i, `/api/workspace/posts/${posts[i]?.id}/cancel`, 'POST');
      return { status: result.status, valid: result.status === 200 };
    }),
  );
  results.push(
    await measure('delete-draft', 1000, async (i) => {
      const result = await send(i, `/api/workspace/posts/${posts[i]?.id}`, 'DELETE');
      return { status: result.status, valid: result.status === 200 };
    }),
  );
  expect(
    await fixture.db.post.count({ where: { userId: { in: fixture.users.map((u) => u.id) } } }),
  ).toBe(0);
}
