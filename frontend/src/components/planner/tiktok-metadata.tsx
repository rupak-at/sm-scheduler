import type { useTikTokSettings } from '@/hooks/planner/use-tiktok-settings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
const privacyLabels = {
  PUBLIC_TO_EVERYONE: 'Everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends',
  FOLLOWER_OF_CREATOR: 'Followers',
  SELF_ONLY: 'Only me',
};
export function TikTokMetadata({
  tiktok,
  video,
}: {
  tiktok: ReturnType<typeof useTikTokSettings>;
  video: boolean;
}) {
  const { creator, settings, update } = tiktok;
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="tiktok-privacy">Who can view this post?</Label>
        <select
          id="tiktok-privacy"
          name="tiktok-privacy"
          value={settings.privacy ?? ''}
          autoComplete="off"
          disabled={!creator}
          onChange={(event) => update({ privacy: event.target.value as typeof settings.privacy })}
          className="h-11 w-full rounded-lg border border-input bg-paper px-3 text-base text-ink focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
        >
          <option value="" disabled>
            Choose visibility
          </option>
          {creator?.privacy_level_options
            .filter((level) => tiktok.audited || level === 'SELF_ONLY')
            .map((level) => (
              <option
                key={level}
                value={level}
                disabled={level === 'SELF_ONLY' && settings.brandedContent}
              >
                {privacyLabels[level]}
              </option>
            ))}
        </select>
      </div>
      {!video && (
        <div className="space-y-2">
          <Label htmlFor="tiktok-photo-title">Photo title (optional)</Label>
          <Input
            id="tiktok-photo-title"
            name="tiktok-photo-title"
            autoComplete="off"
            maxLength={90}
            value={settings.photoTitle}
            onChange={(event) => update({ photoTitle: event.target.value })}
          />
        </div>
      )}
    </>
  );
}
