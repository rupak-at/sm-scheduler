'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { z } from 'zod';
import type { workspaceSchema } from '@social-scheduler/shared';
import { loadWorkspace, workspaceRequest } from '@/lib/planner/workspace-client';

export function useWorkspace(initial: z.infer<typeof workspaceSchema>, query: string) {
  const [data, setData] = useState(initial);
  const generation = useRef(0);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const reload = useCallback(async () => {
    const current = generation.current;
    const latest = await loadWorkspace(query);
    if (generation.current === current) setData(latest);
  }, [query]);
  useEffect(() => {
    generation.current += 1;
    setData(initial);
  }, [initial]);
  useEffect(() => {
    const timer = setInterval(() => {
      void reload().catch(() => setError('Could not refresh your workspace. Try again shortly.'));
    }, 20000);
    return () => clearInterval(timer);
  }, [reload]);
  async function act(path: string, method = 'POST') {
    setPending(true);
    setError('');
    try {
      await workspaceRequest(path, method);
      await reload();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Action failed.');
    } finally {
      setPending(false);
    }
  }
  async function refresh() {
    setError('');
    try {
      await reload();
    } catch {
      setError('Could not refresh. Check API availability and try again.');
    }
  }
  return { data, reload, refresh, act, error, pending };
}
