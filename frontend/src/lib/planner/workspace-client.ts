import { workspaceSchema } from '@social-scheduler/shared';
export async function workspaceRequest<T>(
  path: string,
  method = 'POST',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/workspace${path}`, {
    method,
    cache: 'no-store',
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error ?? 'This action could not be completed. Try again.');
  return result as T;
}
export async function loadWorkspace(query: string) {
  return workspaceSchema.parse(await workspaceRequest<unknown>(`?${query}`, 'GET'));
}
