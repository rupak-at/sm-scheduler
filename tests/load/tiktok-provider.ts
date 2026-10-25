import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { PrismaClient } from '../../backend/src/database/index.js';
import { TikTokClient } from '../../backend/src/integrations/tiktok/client.js';
import { TikTokAccountTokens } from '../../backend/src/integrations/tiktok/account-tokens.js';
import { TokenVault } from '../../backend/src/integrations/instagram/token-crypto.js';
import { tokenData } from '../../backend/src/integrations/tiktok/accounts.js';
import { tiktokSettingsSchema } from '@social-scheduler/shared';

export const tiktokLoadSettings = tiktokSettingsSchema.parse({
  privacy: 'SELF_ONLY',
  consent: true,
});
const key = Buffer.alloc(32, 7).toString('base64');

export function tiktokLoadAccount(openId: string) {
  return tokenData(new TokenVault(key, 'tiktok'), {
    open_id: openId,
    access_token: openId,
    refresh_token: `refresh:${openId}`,
    expires_in: 86400,
    refresh_expires_in: 2592000,
    scope: 'user.info.basic,video.publish',
    token_type: 'Bearer',
  });
}

export function createLoadTikTok(db: PrismaClient, webOrigin: string) {
  const sends = new Map<string, number>();
  const publishes = new Map<string, string>();
  const browserId = randomUUID();
  const ok = (data: unknown) => Response.json({ data, error: { code: 'ok' } });
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const token = new Headers(init?.headers).get('Authorization')?.replace('Bearer ', '');
    if (url.pathname === '/v2/oauth/token/')
      return Response.json({
        open_id: browserId,
        access_token: browserId,
        refresh_token: 'fixture-refresh',
        token_type: 'Bearer',
        expires_in: 86400,
        refresh_expires_in: 2592000,
        scope: 'user.info.basic,video.publish',
      });
    if (url.pathname === '/v2/user/info/')
      return ok({ user: { open_id: token, display_name: 'TikTok load creator' } });
    if (url.pathname.endsWith('/creator_info/query/'))
      return ok({
        creator_username: 'tiktok_load',
        creator_nickname: 'TikTok load creator',
        privacy_level_options: ['SELF_ONLY'],
        comment_disabled: false,
        duet_disabled: false,
        stitch_disabled: false,
        max_video_post_duration_sec: 300,
      });
    if (url.pathname.endsWith('/init/')) {
      const body = z
        .object({
          source_info: z.object({
            video_url: z.string().optional(),
            photo_images: z.array(z.string()).optional(),
          }),
        })
        .parse(JSON.parse(String(init?.body)));
      const media = body.source_info.video_url ?? body.source_info.photo_images?.[0];
      if (!media) throw new Error('Fixture requires publication-bound media');
      const publicationId = new URL(media).pathname.split('/')[4]!;
      sends.set(publicationId, (sends.get(publicationId) ?? 0) + 1);
      const publishId = randomUUID();
      publishes.set(publishId, token ?? '');
      return ok({ publish_id: publishId });
    }
    if (url.pathname.endsWith('/status/fetch/')) {
      const body = z.object({ publish_id: z.string() }).parse(JSON.parse(String(init?.body)));
      if (publishes.get(body.publish_id) !== token) throw new Error('Wrong creator status poll');
      return ok({ status: 'PUBLISH_COMPLETE', publicaly_available_post_id: [] });
    }
    throw new Error('Unexpected TikTok fixture request');
  };
  const client = new TikTokClient(
    {
      clientKey: 'load-fixture',
      clientSecret: 'fixture-only',
      redirectUri: `${webOrigin}/api/auth/tiktok/callback`,
    },
    fetcher,
  );
  const vault = new TokenVault(key, 'tiktok');
  return {
    client,
    vault,
    tokens: new TikTokAccountTokens(db, client, vault),
    audited: false,
    mediaOrigin: 'https://fixture.example',
    signingKey: key,
    sends,
  };
}
