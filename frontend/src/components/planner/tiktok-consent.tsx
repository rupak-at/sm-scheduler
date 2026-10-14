import type { useTikTokSettings } from '@/hooks/planner/use-tiktok-settings';
import { TikTokToggle } from '@/components/planner/tiktok-toggle';
export function TikTokConsent({ tiktok }: { tiktok: ReturnType<typeof useTikTokSettings> }) {
  const { settings, update } = tiktok;
  return (
    <TikTokToggle
      id="tiktok-consent"
      checked={settings.consent}
      change={(consent) => update({ consent })}
    >
      Send this post to TikTok at its scheduled time. By posting, you agree to TikTok’s{' '}
      {settings.brandedContent && (
        <>
          <a
            href="https://www.tiktok.com/legal/page/global/bc-policy/en"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Branded Content Policy
          </a>{' '}
          and{' '}
        </>
      )}
      <a
        href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        Music Usage Confirmation
      </a>
      .
    </TikTokToggle>
  );
}
