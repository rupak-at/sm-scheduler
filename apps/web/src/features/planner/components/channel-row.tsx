import type { Channel } from '@social-scheduler/shared';
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
  return (
    <div className="space-y-2 border-t border-line pt-4">
      <p className="text-sm font-medium break-words">@{channel.displayName ?? 'Instagram'}</p>
      <p className="text-xs text-muted">
        {channel.status === 'CONNECTED'
          ? 'Connected'
          : channel.status.toLowerCase().replaceAll('_', ' ')}
      </p>
      {channel.tokenExpiresAt && (
        <p className="text-xs text-muted">
          Access expires{' '}
          {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(
            new Date(channel.tokenExpiresAt),
          )}{' '}
          (UTC)
        </p>
      )}
      {channel.status === 'CONNECTED' && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void act(`/channels/${channel.id}/validate`)}
          >
            Check connection
          </Button>
          <Button
            variant="ghost"
            size="sm"
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
  );
}
