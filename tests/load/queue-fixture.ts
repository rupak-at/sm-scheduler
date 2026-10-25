import { randomUUID } from 'node:crypto';
import { InstagramClient } from '../../backend/src/integrations/instagram/client.js';
import type { createLoadFixture } from './fixture.js';
import { tiktokLoadSettings } from './tiktok-provider.js';
import { youtubeLoadSettings } from './youtube-provider.js';

export function queueProvider() {
  const sends = new Map<string, number>();
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const token = new Headers(init?.headers).get('authorization')?.replace('Bearer ', '');
    if (url.pathname.endsWith('/me'))
      return Response.json({ id: token, username: 'load_creator', account_type: 'BUSINESS' });
    if (url.pathname.endsWith('/content_publishing_limit'))
      return Response.json({ data: [{ quota_usage: 0 }] });
    if (url.pathname.endsWith('/media')) return Response.json({ id: randomUUID() });
    if (url.pathname.endsWith('/media_publish')) {
      const id = new URLSearchParams(String(init?.body)).get('creation_id')!;
      sends.set(id, (sends.get(id) ?? 0) + 1);
      return Response.json({ id: `published-${id}` });
    }
    return Response.json({ status_code: 'FINISHED' });
  };
  const client = new InstagramClient(
    {
      appId: 'fixture',
      appSecret: 'fixture-only',
      redirectUri: 'https://fixture.example/callback',
      version: 'v25.0',
    },
    fetcher,
  );
  return { client, sends };
}

export async function seedPublications(fixture: Awaited<ReturnType<typeof createLoadFixture>>) {
  const posts = fixture.users.map((user) => ({
    id: randomUUID(),
    userId: user.id,
    caption: 'Queued load fixture',
  }));
  await fixture.db.post.createMany({ data: posts });
  await fixture.db.postMedia.createMany({
    data: posts.map((post, i) => ({
      postId: post.id,
      mediaAssetId: fixture.users[i]!.mediaId,
      position: 0,
    })),
  });
  await fixture.db.publication.createMany({
    data: posts.map((post, i) => ({
      postId: post.id,
      socialAccountId: fixture.users[i]!.channelId,
      status: 'SCHEDULED',
      scheduledAt: new Date(0),
      ...(fixture.tiktok
        ? {
            providerMetadata: { tiktok: tiktokLoadSettings, consentedAt: new Date().toISOString() },
          }
        : {}),
      ...(fixture.youtube
        ? {
            providerMetadata: {
              youtube: youtubeLoadSettings,
              youtubeConsentedAt: new Date().toISOString(),
            },
          }
        : {}),
    })),
  });
}

export function isolatedRedis() {
  const url = new URL(process.env.TEST_REDIS_URL ?? '');
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/1')
    throw new Error('Load queue requires loopback TEST_REDIS_URL using dedicated database /1');
  return url.toString();
}
