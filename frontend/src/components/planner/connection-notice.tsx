const messages: Record<string, string> = {
  YOUTUBE_connected:
    'YouTube channel connected. Add an MP4 video and review its publishing settings.',
  YOUTUBE_ACCOUNT_ALREADY_LINKED:
    'This YouTube channel belongs to another workspace. Use that workspace or select another channel.',
  YOUTUBE_OFFLINE_ACCESS_REQUIRED:
    'Allow offline YouTube access so scheduled uploads can continue after you close the browser.',
  YOUTUBE_CHANNEL_SELECTION_REQUIRED:
    'Choose a Google or Brand account with one YouTube channel, then reconnect.',
  TIKTOK_connected:
    'TikTok connected. Review its posting settings when scheduling a photo or video.',
  TIKTOK_AUTHORIZATION_DECLINED:
    'TikTok did not approve this connection. Check the Sandbox target user and try again.',
  TIKTOK_OAUTH_INVALID_SCOPE:
    'TikTok rejected a requested permission. Enable Login Kit and video.publish in Sandbox, apply changes, then reconnect.',
  TIKTOK_OAUTH_APP_CONFIGURATION:
    'TikTok rejected this app configuration. Check the Sandbox client key and Login Kit settings, then reconnect.',
  TIKTOK_OAUTH_REQUEST_REJECTED:
    'TikTok rejected the connection request. Check the exact HTTPS callback in Sandbox Login Kit, then reconnect.',
  TIKTOK_OAUTH_PROVIDER_UNAVAILABLE:
    'TikTok could not complete authorization right now. Try connecting again later.',
  TIKTOK_OAUTH_FAILED:
    'TikTok did not return an authorization code. Check Sandbox settings, then reconnect.',
  TIKTOK_INVALID_OAUTH_STATE:
    'This TikTok connection expired or belongs to another browser. Start again here.',
  TIKTOK_SESSION_CHANGED: 'Your session changed during TikTok connection. Log in and start again.',
  TIKTOK_ACCOUNT_ALREADY_LINKED:
    'This TikTok account belongs to another workspace. Use that workspace or connect a different account.',
  TIKTOK_PERMISSION_REQUIRED: 'Allow profile and direct publishing access, then reconnect TikTok.',
  FACEBOOK_connected:
    'Facebook Pages connected. You can create photo and video posts with captions.',
  FACEBOOK_NO_ELIGIBLE_PAGES:
    'No eligible Pages were found. Allow a Page where you have permission to create content, then reconnect.',
  FACEBOOK_AUTHORIZATION_DECLINED:
    'Facebook access was declined. Connect again and allow the requested Page permissions.',
  FACEBOOK_INVALID_OAUTH_STATE:
    'This Facebook connection expired or belongs to another browser. Start again here.',
  FACEBOOK_SESSION_CHANGED:
    'Your workspace session changed during Facebook connection. Log in and start again.',
  FACEBOOK_ACCOUNT_ALREADY_LINKED:
    'An authorized Facebook Page belongs to another workspace. Choose different Pages or use that workspace.',
  FACEBOOK_PERMISSION_REQUIRED:
    'Allow Page listing, reading, and publishing permissions, then reconnect Facebook.',
  FACEBOOK_TOKEN_REVOKED: 'Facebook access was revoked. Reconnect your Pages to restore access.',
  connected: 'Instagram connected. You can start creating posts.',
  AUTHORIZATION_DECLINED:
    'Instagram access was declined. Connect again and allow both requested permissions.',
  INVALID_OAUTH_STATE:
    'This connection link expired or belongs to another browser. Start again here.',
  SESSION_CHANGED: 'Your workspace session changed during connection. Log in and start again.',
  ACCOUNT_ALREADY_LINKED:
    'This Instagram account belongs to another workspace. Sign in with Instagram to open that workspace.',
  PERMISSION_REQUIRED: 'Allow profile access and publishing permission, then connect again.',
  TOKEN_REVOKED: 'Instagram access was revoked. Connect again to restore access.',
};
export function ConnectionNotice({ code }: { code?: string | undefined }) {
  if (!code) return null;
  return (
    <p role="status" className="mb-6 rounded-lg border border-line bg-surface p-4 text-sm">
      {messages[code] ??
        (code.startsWith('YOUTUBE_')
          ? 'YouTube could not connect. Check your Google app permissions and channel, then start a fresh connection.'
          : code.startsWith('TIKTOK_')
            ? 'TikTok could not connect. Check Login Kit and Content Posting app permissions, then try again.'
            : code.startsWith('FACEBOOK_')
              ? 'Facebook could not connect. Check Page access and Facebook app settings, then try again.'
              : 'Instagram could not connect. Check your professional account and app settings, then try again.')}
    </p>
  );
}
