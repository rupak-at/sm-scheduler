'use client';
import type { Channel } from '@social-scheduler/shared';
import { ProviderChannels } from '@/components/planner/provider-channels';
export function ChannelsPanel({
  channels,
  configured,
  facebookConfigured,
  tiktokConfigured,
  act,
  pending,
}: {
  channels: Channel[];
  configured: boolean;
  facebookConfigured: boolean;
  tiktokConfigured: boolean;
  act: (path: string) => Promise<void>;
  pending: boolean;
}) {
  return (
    <section
      id="channels"
      className="min-w-0 scroll-mt-6 rounded-xl border border-line bg-paper p-5"
      aria-labelledby="channels-heading"
    >
      <h2 id="channels-heading" className="text-[15px] font-semibold">
        Your accounts
      </h2>
      <ProviderChannels
        channels={channels.filter((channel) => channel.provider === 'INSTAGRAM')}
        provider="INSTAGRAM"
        configured={configured}
        act={act}
        pending={pending}
      />
      <ProviderChannels
        channels={channels.filter((channel) => channel.provider === 'FACEBOOK')}
        provider="FACEBOOK"
        configured={facebookConfigured}
        act={act}
        pending={pending}
      />
      <ProviderChannels
        channels={channels.filter((channel) => channel.provider === 'TIKTOK')}
        provider="TIKTOK"
        configured={tiktokConfigured}
        act={act}
        pending={pending}
      />
    </section>
  );
}
