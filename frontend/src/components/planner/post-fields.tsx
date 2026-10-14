import type { Channel } from '@social-scheduler/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { usePostEditor } from '@/hooks/planner/use-post-editor';
import { channelName, channelProvider } from '@/lib/planner/channels';
export function PostFields({
  editor,
  channels,
}: {
  editor: ReturnType<typeof usePostEditor>;
  channels: Channel[];
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="channel">Publish to</Label>
        <select
          id="channel"
          name="channel"
          value={editor.channelId}
          onChange={(event) => editor.setChannelId(event.target.value)}
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-input bg-paper px-3 text-base text-ink focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          required
        >
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channelProvider(channel)} · {channelName(channel)}
              {channel.status !== 'CONNECTED' ? ' (reconnect to schedule)' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="scheduled">Publish date and time</Label>
        <Input
          id="scheduled"
          name="scheduled"
          type="datetime-local"
          value={editor.scheduled}
          onChange={(event) => editor.setScheduled(event.target.value)}
          aria-describedby="schedule-help"
        />
        <p id="schedule-help" className="text-xs text-muted">
          Your timezone: {editor.timezone}. Leave empty to save a draft.
        </p>
      </div>
    </>
  );
}
