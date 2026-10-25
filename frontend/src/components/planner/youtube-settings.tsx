import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { usePostEditor } from '@/hooks/planner/use-post-editor';

const selectClass =
  'h-11 w-full rounded-lg border border-input bg-paper px-3 text-base text-ink focus-visible:ring-2 focus-visible:ring-ring sm:text-sm';
export function YouTubeSettings({ editor }: { editor: ReturnType<typeof usePostEditor> }) {
  const { youtube } = editor;
  if (!youtube.active) return null;
  const { settings, update } = youtube;
  return (
    <section
      aria-labelledby="youtube-settings-heading"
      className="space-y-4 rounded-xl border border-line p-4"
    >
      <h3 id="youtube-settings-heading" className="text-sm font-semibold">
        YouTube video settings
      </h3>
      <p className="text-xs leading-relaxed text-muted">
        Your caption and hashtags become the video description. Uploads start at the scheduled time;
        YouTube processing can take longer.
      </p>
      <YouTubeFields youtube={youtube} />
      <YouTubeToggle
        id="youtube-synthetic"
        checked={settings.containsSyntheticMedia}
        change={(value) => update({ containsSyntheticMedia: value })}
      >
        Contains realistic altered or synthetic content
      </YouTubeToggle>
      <YouTubeToggle
        id="youtube-paid"
        checked={settings.paidPromotion}
        change={(value) => update({ paidPromotion: value })}
      >
        Contains paid promotion
      </YouTubeToggle>
      <YouTubeToggle
        id="youtube-notify"
        checked={settings.notifySubscribers}
        change={(value) => update({ notifySubscribers: value })}
      >
        Notify subscribers
      </YouTubeToggle>
      <YouTubeToggle
        id="youtube-consent"
        checked={settings.consent}
        change={(consent) => update({ consent })}
      >
        Upload this video to the selected YouTube channel at its scheduled time with these settings.
        By posting, you agree to the{' '}
        <a
          href="https://www.youtube.com/t/terms"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          YouTube Terms of Service
        </a>
        .
      </YouTubeToggle>
      <p id="youtube-settings-status" role="status" className="text-xs leading-relaxed text-muted">
        {youtube.problem ||
          'Ready to schedule. Category: People & Blogs. Visibility follows your choice above.'}
      </p>
    </section>
  );
}
function YouTubeFields({ youtube }: { youtube: ReturnType<typeof usePostEditor>['youtube'] }) {
  const { settings, update } = youtube;
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="youtube-title">Video title</Label>
        <Input
          id="youtube-title"
          name="youtube-title"
          autoComplete="off"
          value={settings.title}
          maxLength={100}
          onChange={(event) => update({ title: event.target.value })}
          aria-describedby="youtube-settings-status"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="youtube-privacy">Visibility</Label>
        <select
          id="youtube-privacy"
          aria-describedby="youtube-settings-status"
          name="youtube-privacy"
          autoComplete="off"
          className={selectClass}
          value={settings.privacy ?? ''}
          onChange={(event) => update({ privacy: event.target.value as typeof settings.privacy })}
        >
          <option value="" disabled>
            Choose visibility
          </option>
          <option value="private">Private</option>
          <option value="unlisted">Unlisted</option>
          <option value="public">Public</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="youtube-audience">Is this video made for kids?</Label>
        <select
          id="youtube-audience"
          aria-describedby="youtube-settings-status"
          name="youtube-audience"
          autoComplete="off"
          className={selectClass}
          value={settings.madeForKids === null ? '' : String(settings.madeForKids)}
          onChange={(event) => update({ madeForKids: event.target.value === 'true' })}
        >
          <option value="" disabled>
            Choose audience
          </option>
          <option value="true">Yes, made for kids</option>
          <option value="false">No, not made for kids</option>
        </select>
      </div>
    </>
  );
}
function YouTubeToggle({
  id,
  checked,
  change,
  children,
}: {
  id: string;
  checked: boolean;
  change: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm leading-relaxed"
    >
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => change(event.target.checked)}
        className="mt-1 size-4 shrink-0 accent-ink focus-visible:ring-2 focus-visible:ring-ring"
      />
      <span>{children}</span>
    </label>
  );
}
