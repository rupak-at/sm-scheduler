import { TikTokMetadata } from '@/components/planner/tiktok-metadata';
import { TikTokInteractions } from '@/components/planner/tiktok-interactions';
import { TikTokConsent } from '@/components/planner/tiktok-consent';
import { TikTokCommercial } from '@/components/planner/tiktok-commercial';
import type { usePostEditor } from '@/hooks/planner/use-post-editor';
export function TikTokSettings({ editor }: { editor: ReturnType<typeof usePostEditor> }) {
  const { tiktok } = editor;
  if (!tiktok.active) return null;
  const { creator } = tiktok;
  const video = editor.preview?.mimeType === 'video/mp4';
  return (
    <section
      aria-labelledby="tiktok-settings-heading"
      className="space-y-3 rounded-xl border border-line p-4"
    >
      <h3 id="tiktok-settings-heading" className="text-sm font-semibold">
        TikTok posting settings
      </h3>
      {creator && (
        <p className="text-sm [overflow-wrap:anywhere]">
          Posting as {creator.creator_nickname} (@{creator.creator_username})
        </p>
      )}
      {!tiktok.audited && (
        <p className="text-xs leading-relaxed text-muted">
          Private testing: choose Only me and use a private TikTok account. Public posting requires
          TikTok’s audit.
        </p>
      )}
      <TikTokMetadata tiktok={tiktok} video={video} />
      <TikTokInteractions tiktok={tiktok} video={video} />
      <TikTokCommercial tiktok={tiktok} />
      <TikTokConsent tiktok={tiktok} />
      <p role="status" className="text-xs leading-relaxed text-muted">
        {tiktok.problem ||
          'TikTok may take a few minutes to process your post before it appears on your profile.'}
      </p>
    </section>
  );
}
