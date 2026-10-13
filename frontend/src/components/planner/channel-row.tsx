import type { Channel } from '@social-scheduler/shared';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function ChannelRow({
  channel,
  act,
  pending,
}: {
  channel: Channel;
  act: (path: string) => Promise<void>;
  pending: boolean;
}) {
  const connected = channel.status === 'CONNECTED';
  return (
    <div className="border-b border-line pb-1 last:border-b-0">
      <div className="flex items-center gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-paper text-sm font-medium"
          aria-hidden="true"
        >
          {(channel.displayName ?? 'I').charAt(0).toLocaleUpperCase()}
        </span>
        <div className="min-w-0">
          <p
            className="truncate text-sm font-medium"
            title={`@${channel.displayName ?? 'Instagram'}`}
          >
            @{channel.displayName ?? 'Instagram'}
          </p>
          <p
            className={`mt-0.5 flex items-center gap-1.5 text-xs ${connected ? 'text-success' : 'text-destructive'}`}
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {connected ? 'Connected' : channel.status.toLowerCase().replaceAll('_', ' ')}
          </p>
        </div>
      </div>
      <ConnectionDetails channel={channel} act={act} pending={pending} />
    </div>
  );
}

function ConnectionDetails({
  channel,
  act,
  pending,
}: {
  channel: Channel;
  act: (path: string) => Promise<void>;
  pending: boolean;
}) {
  const connected = channel.status === 'CONNECTED';
  return (
    <details className="group mt-2">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-md text-xs text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        Connection details
        <ChevronDown className="size-3.5 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-3 border-t border-line pt-3">
        {channel.tokenExpiresAt && (
          <p className="text-xs leading-relaxed text-muted">
            Access expires{' '}
            {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(
              new Date(channel.tokenExpiresAt),
            )}{' '}
            (UTC)
          </p>
        )}
        {connected && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-11 w-full"
              disabled={pending}
              onClick={() => void act(`/channels/${channel.id}/validate`)}
            >
              <ShieldCheck aria-hidden="true" />
              Check connection
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-11 w-full text-muted"
              disabled={pending}
              onClick={() => {
                if (
                  window.confirm(
                    'Disconnect Instagram? Scheduled posts will fail until you reconnect. You can still sign in with Instagram.',
                  )
                )
                  void act(`/channels/${channel.id}/disconnect`);
              }}
            >
              Disconnect
            </Button>
          </div>
        )}
      </div>
    </details>
  );
}
