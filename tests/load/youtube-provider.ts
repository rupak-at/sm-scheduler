import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { youtubeSettingsSchema } from '@social-scheduler/shared';
import type { PrismaClient } from '../../backend/src/database/index.js';
import { YouTubeClient } from '../../backend/src/integrations/youtube/client.js';
import { YouTubeUploads } from '../../backend/src/integrations/youtube/uploads.js';
import { YouTubeAccountTokens } from '../../backend/src/integrations/youtube/account-tokens.js';
import { youtubeTokenData } from '../../backend/src/integrations/youtube/accounts.js';
import { YOUTUBE_SCOPES } from '../../backend/src/integrations/youtube/schemas.js';
import { TokenVault } from '../../backend/src/integrations/instagram/token-crypto.js';

const key = Buffer.alloc(32, 7).toString('base64');
export const youtubeLoadSettings = youtubeSettingsSchema.parse({
  title: 'Load video',
  privacy: 'private',
  madeForKids: false,
  consent: true,
});
export function youtubeLoadAccount(channelId: string) {
  return youtubeTokenData(new TokenVault(key, 'youtube'), channelId, {
    access_token: channelId,
    refresh_token: `refresh-${channelId}`,
    token_type: 'Bearer',
    expires_in: 86400,
    scope: YOUTUBE_SCOPES.join(' '),
  });
}
export function createLoadYouTube(db: PrismaClient, webOrigin: string) {
  const sends = new Map<string, number>();
  const sessions = new Map<string, { channel: string; privacy: string; videoId?: string }>();
  const videos = new Map<string, { channel: string; privacy: string }>();
  const channelId = `UC-${randomUUID()}`;
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const token = new Headers(init?.headers).get('Authorization')?.replace('Bearer ', '') ?? '';
    if (url.hostname === 'oauth2.googleapis.com')
      return Response.json({
        access_token: channelId,
        refresh_token: 'fixture-refresh',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: YOUTUBE_SCOPES.join(' '),
      });
    if (url.pathname === '/youtube/v3/channels')
      return Response.json({ items: [{ id: token, snippet: { title: 'YouTube load creator' } }] });
    if (url.pathname === '/youtube/v3/videos') {
      const id = url.searchParams.get('id')!;
      const video = videos.get(id);
      if (!video || video.channel !== token) throw new Error('Foreign fixture video poll');
      return Response.json({
        items: [
          {
            id,
            snippet: { channelId: token },
            status: { uploadStatus: 'processed', privacyStatus: video.privacy },
          },
        ],
      });
    }
    if (init?.method === 'POST') {
      const body = z
        .object({ status: z.object({ privacyStatus: z.string() }) })
        .parse(JSON.parse(String(init.body)));
      const id = randomUUID();
      sessions.set(id, { channel: token, privacy: body.status.privacyStatus });
      return new Response(null, {
        headers: {
          location: `https://www.googleapis.com/upload/youtube/v3/videos?upload_id=${id}`,
        },
      });
    }
    const id = url.searchParams.get('upload_id')!;
    const session = sessions.get(id);
    if (!session || session.channel !== token) throw new Error('Foreign fixture upload');
    if (new Headers(init?.headers).get('Content-Range')?.startsWith('bytes */'))
      return session.videoId
        ? Response.json({ id: session.videoId })
        : new Response(null, { status: 308 });
    sends.set(id, (sends.get(id) ?? 0) + 1);
    session.videoId = randomUUID();
    videos.set(session.videoId, session);
    return Response.json({ id: session.videoId }, { status: 201 });
  };
  const client = new YouTubeClient(
    {
      clientId: 'load-fixture',
      clientSecret: 'fixture-only-secret',
      redirectUri: `${webOrigin}/api/auth/youtube/callback`,
    },
    fetcher,
  );
  const vault = new TokenVault(key, 'youtube');
  return {
    client,
    vault,
    uploads: new YouTubeUploads(fetcher),
    uploadVault: new TokenVault(key, 'youtube-upload'),
    tokens: new YouTubeAccountTokens(db, client, vault),
    sends,
  };
}
