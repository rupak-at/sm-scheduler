import type { Channel, PlannerPost } from '@social-scheduler/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { usePostEditor } from '../hooks/use-post-editor';
export function PostFields({
  editor,
  channels,
  post,
}: {
  editor: ReturnType<typeof usePostEditor>;
  channels: Channel[];
  post?: PlannerPost;
}) {
  return (
    <>
      {' '}
      <div className="space-y-2">
        <Label htmlFor="channel">Instagram account</Label>
        <select
          id="channel"
          name="channel"
          defaultValue={post?.socialAccountId ?? channels[0]?.id}
          className="h-11 w-full rounded-lg border border-input bg-paper px-3 text-sm"
          required
        >
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              @{channel.displayName ?? 'Instagram'}
              {channel.status !== 'CONNECTED' ? ' (reconnect to schedule)' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="caption">Caption</Label>
        <textarea
          id="caption"
          name="caption"
          value={editor.caption}
          onChange={(event) => editor.setCaption(event.target.value)}
          maxLength={2200}
          rows={5}
          autoComplete="off"
          className="w-full resize-y rounded-lg border border-input bg-paper px-3 py-3 text-sm leading-relaxed focus-visible:ring-2 focus-visible:ring-ring"
          aria-describedby="caption-help"
        />
        <p id="caption-help" className="text-right text-xs text-muted tabular-nums">
          {editor.caption.length} / 2,200 characters
        </p>
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
