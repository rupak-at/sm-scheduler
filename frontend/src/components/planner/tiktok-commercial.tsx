import type { useTikTokSettings } from '@/hooks/planner/use-tiktok-settings';
import { TikTokToggle } from '@/components/planner/tiktok-toggle';

export function TikTokCommercial({ tiktok }: { tiktok: ReturnType<typeof useTikTokSettings> }) {
  const { settings, update } = tiktok;
  return (
    <div className="border-t border-line pt-3">
      <TikTokToggle
        id="tiktok-commercial"
        checked={settings.commercial}
        change={(commercial) => update({ commercial, ownBrand: false, brandedContent: false })}
      >
        Disclose commercial content
      </TikTokToggle>
      <p className="text-xs leading-relaxed text-muted">
        Turn this on if the post promotes you, a brand, product, or service.
      </p>
      {settings.commercial && (
        <div className="mt-2 pl-7">
          <TikTokToggle
            id="tiktok-own-brand"
            checked={settings.ownBrand}
            change={(ownBrand) => update({ ownBrand })}
          >
            Your brand
          </TikTokToggle>
          <TikTokToggle
            id="tiktok-branded"
            checked={settings.brandedContent}
            disabled={settings.privacy === 'SELF_ONLY'}
            change={(brandedContent) => update({ brandedContent })}
          >
            Branded content
          </TikTokToggle>
          {settings.privacy === 'SELF_ONLY' && (
            <p className="text-xs text-muted">Branded content cannot be private.</p>
          )}
          <p role="status" className="mt-2 text-xs leading-relaxed text-muted">
            {settings.brandedContent
              ? 'Your post will be labeled Paid partnership.'
              : settings.ownBrand
                ? 'Your post will be labeled Promotional content.'
                : 'Choose Your brand, Branded content, or both to schedule.'}
          </p>
        </div>
      )}
    </div>
  );
}
