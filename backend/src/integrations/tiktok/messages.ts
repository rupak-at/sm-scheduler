const messages: Record<string, string> = {
  CONSENT_REQUIRED: 'Confirm that this post may be sent to TikTok at its scheduled time.',
  PRIVACY_SELECTION_REQUIRED:
    'Choose a visibility option currently allowed by your TikTok account.',
  PRIVATE_TEST_ACCOUNT_REQUIRED:
    'Use a private TikTok account and Only me visibility until this app passes its Direct Post audit.',
  INTERACTION_SETTINGS_CHANGED:
    'Your TikTok interaction permissions changed. Review the post before scheduling.',
  COMMERCIAL_DISCLOSURE_REQUIRED:
    'Choose Your brand, Branded content, or both when disclosing commercial content.',
  BRANDED_CONTENT_CANNOT_BE_PRIVATE: 'Branded content cannot use Only me visibility.',
  VIDEO_EXCEEDS_CREATOR_LIMITS:
    'Upload an MP4 with at least 360 pixels on each side and within your TikTok account’s duration limit. Older uploads need to be uploaded again.',
  CREATOR_POSTING_UNAVAILABLE:
    'TikTok cannot accept posts for this account right now. Try again later.',
  MEDIA_DOMAIN_UNVERIFIED: 'Verify the API media domain in your TikTok app before scheduling.',
  TOKEN_EXPIRED: 'Reconnect TikTok to restore publishing access.',
  TOKEN_REVOKED: 'TikTok access was revoked. Reconnect this account.',
  PERMISSION_REQUIRED: 'Allow profile and direct publishing access, then reconnect TikTok.',
  PROVIDER_NOT_CONFIGURED: 'Configure TikTok before scheduling.',
};
export function tiktokMessage(code: string): string {
  return (
    messages[code] ??
    'TikTok could not complete this request. Check the connection and posting settings, then try again.'
  );
}
