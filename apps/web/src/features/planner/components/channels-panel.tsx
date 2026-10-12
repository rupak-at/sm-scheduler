'use client';
import type { Channel } from '@social-scheduler/shared';
import { InstagramButton } from '@/features/auth/components/instagram-button';
import { ChannelRow } from './channel-row';

export function ChannelsPanel({
  channels,
  configured,
  act,
  pending,
}: {
  channels: Channel[];
  configured: boolean;
  act: (path: string) => Promise<void>;
  pending: boolean;
}) {
  return (
    <section
      className="rounded-xl border border-line bg-paper p-5"
      aria-labelledby="channels-heading"
    >
      <h2 id="channels-heading" className="font-medium">
        Your Instagram
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Connect a Business or Creator account to publish photos and Reels.
      </p>
      <div className="mt-5 space-y-5">
        {channels.map((channel) => (
          <ChannelRow key={channel.id} channel={channel} act={act} pending={pending} />
        ))}
      </div>
      <div className="mt-5">
        <InstagramButton
          mode="connect"
          disabled={!configured || pending}
          label={channels.length ? 'Connect or reconnect' : 'Connect Instagram'}
        />
      </div>
      {!configured && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Instagram connection is not configured for this workspace yet.
        </p>
      )}
    </section>
  );
}
