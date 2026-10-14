import { Instagram, Facebook, Music2 } from 'lucide-react';
import type { Channel } from '@social-scheduler/shared';
import { InstagramButton } from '@/components/auth/instagram-button';
import { ChannelRow } from '@/components/planner/channel-row';
import { ProviderConnectButton } from '@/components/planner/provider-connect-button';

export function ProviderChannels({
  channels,
  provider,
  configured,
  act,
  pending,
}: {
  channels: Channel[];
  provider: 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK';
  configured: boolean;
  act: (path: string) => Promise<void>;
  pending: boolean;
}) {
  const facebook = provider === 'FACEBOOK';
  const tiktok = provider === 'TIKTOK';
  const name = tiktok ? 'TikTok' : facebook ? 'Facebook' : 'Instagram';
  const Icon = tiktok ? Music2 : facebook ? Facebook : Instagram;
  const connect =
    facebook || tiktok ? (
      <ProviderConnectButton
        provider={tiktok ? 'tiktok' : 'facebook'}
        disabled={!configured || pending}
      />
    ) : (
      <InstagramButton mode="connect" disabled={!configured || pending} label="Connect Instagram" />
    );
  return (
    <div className="mt-4 border-t border-line pt-4">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-muted" aria-hidden="true" />
        {facebook ? 'Facebook Pages' : name}
      </h3>
      {channels.length ? (
        <div className="mt-4 space-y-4">
          {channels.map((channel) => (
            <ChannelRow key={channel.id} channel={channel} act={act} pending={pending} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          {tiktok
            ? 'Connect TikTok to plan photos and videos with your chosen posting settings.'
            : facebook
              ? 'Connect Pages you manage to plan photos and videos with captions.'
              : 'Connect a Business or Creator account to plan photos and Reels.'}
        </p>
      )}
      {channels.length > 0 && channels.every((channel) => channel.status === 'CONNECTED') ? (
        <details className="group mt-2">
          <summary className="flex min-h-11 cursor-pointer items-center rounded-md text-xs text-muted hover:text-ink">
            {facebook ? 'Connect or reconnect Pages' : 'Connect another account'}
          </summary>
          <div className="pt-2">{connect}</div>
        </details>
      ) : (
        <div className="mt-4">{connect}</div>
      )}
      {!configured && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {name} connection is not configured yet.
        </p>
      )}
      {facebook && configured && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Choose which Pages to allow on Facebook. Eligible Pages you allow are connected here. Page
          posts are public.
        </p>
      )}
    </div>
  );
}
