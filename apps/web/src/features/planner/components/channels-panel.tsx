'use client';
import { Instagram } from 'lucide-react';
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
      id="channels"
      className="min-w-0 scroll-mt-6 rounded-xl border border-line bg-paper p-5"
      aria-labelledby="channels-heading"
    >
      <div className="flex items-center gap-2.5">
        <Instagram className="size-4 text-muted" strokeWidth={1.7} aria-hidden="true" />
        <h2 id="channels-heading" className="text-[15px] font-semibold">
          Your Instagram
        </h2>
      </div>
      {channels.length ? (
        <div className="mt-4 space-y-4">
          {channels.map((channel) => (
            <ChannelRow key={channel.id} channel={channel} act={act} pending={pending} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          Connect a Business or Creator account to start planning photos and Reels.
        </p>
      )}
      {channels.length && channels.every((channel) => channel.status === 'CONNECTED') ? (
        <details className="group mt-2">
          <summary className="flex min-h-11 cursor-pointer items-center rounded-md text-xs text-muted hover:text-ink">
            Connect another account
          </summary>
          <div className="pt-2">
            <InstagramButton
              mode="connect"
              disabled={!configured || pending}
              label="Connect Instagram"
            />
          </div>
        </details>
      ) : (
        <div className="mt-4">
          <InstagramButton
            mode="connect"
            disabled={!configured || pending}
            label={channels.length ? 'Connect or reconnect' : 'Connect Instagram'}
          />
        </div>
      )}
      {!configured && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Instagram connection is not configured for this workspace yet.
        </p>
      )}
    </section>
  );
}
