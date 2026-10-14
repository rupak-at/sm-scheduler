import { WorkspaceError } from '../workspace-error.js';

function cloudinaryUrl(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !['api.cloudinary.com', 'res.cloudinary.com'].includes(url.hostname) ||
    (url.port && url.port !== '443')
  )
    throw new WorkspaceError(503, 'Protected media delivery is unavailable.');
  return url;
}
export async function downloadProtectedMedia(
  url: string,
  maximum: number,
  fetcher = fetch,
): Promise<Buffer> {
  let target = cloudinaryUrl(url);
  const signal = AbortSignal.timeout(60000);
  for (let redirects = 0; redirects < 4; redirects++) {
    const response = await fetcher(target, { redirect: 'manual', signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (!location) break;
      target = cloudinaryUrl(new URL(location, target).toString());
      continue;
    }
    if (
      !response.ok ||
      !response.body ||
      Number(response.headers.get('content-length')) > maximum
    ) {
      await response.body?.cancel();
      break;
    }
    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let length = 0;
    try {
      for (;;) {
        const result = await reader.read();
        if (result.done) return Buffer.concat(chunks, length);
        length += result.value.length;
        if (length > maximum)
          throw new WorkspaceError(503, 'Protected media exceeds its upload limit.');
        chunks.push(Buffer.from(result.value));
      }
    } finally {
      await reader.cancel();
    }
  }
  throw new WorkspaceError(503, 'Protected media delivery is unavailable.');
}
