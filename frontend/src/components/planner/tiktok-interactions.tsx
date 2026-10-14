import type { useTikTokSettings } from '@/hooks/planner/use-tiktok-settings';
import { TikTokToggle } from '@/components/planner/tiktok-toggle';
export function TikTokInteractions({
  tiktok,
  video,
}: {
  tiktok: ReturnType<typeof useTikTokSettings>;
  video: boolean;
}) {
  const { creator, settings, update } = tiktok;
  return (
    <>
      <TikTokToggle
        id="tiktok-comment"
        checked={settings.allowComment}
        disabled={!creator || creator.comment_disabled}
        change={(allowComment) => update({ allowComment })}
      >
        Allow comments{creator?.comment_disabled ? ' (disabled on TikTok)' : ''}
      </TikTokToggle>
      {video && (
        <>
          <TikTokToggle
            id="tiktok-duet"
            checked={settings.allowDuet}
            disabled={!creator || creator.duet_disabled}
            change={(allowDuet) => update({ allowDuet })}
          >
            Allow Duet{creator?.duet_disabled ? ' (disabled on TikTok)' : ''}
          </TikTokToggle>
          <TikTokToggle
            id="tiktok-stitch"
            checked={settings.allowStitch}
            disabled={!creator || creator.stitch_disabled}
            change={(allowStitch) => update({ allowStitch })}
          >
            Allow Stitch{creator?.stitch_disabled ? ' (disabled on TikTok)' : ''}
          </TikTokToggle>
          {creator && (
            <p className="text-xs text-muted">
              This account accepts videos up to {creator.max_video_post_duration_sec} seconds; use
              at least 360 pixels on each side.
            </p>
          )}
        </>
      )}
      {!video && (
        <TikTokToggle
          id="tiktok-music"
          checked={settings.autoAddMusic}
          change={(autoAddMusic) => update({ autoAddMusic })}
        >
          Add TikTok’s recommended music
        </TikTokToggle>
      )}
      <TikTokToggle
        id="tiktok-ai"
        checked={settings.aiGenerated}
        change={(aiGenerated) => update({ aiGenerated })}
      >
        Label AI-generated content
      </TikTokToggle>
    </>
  );
}
