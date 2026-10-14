const messages: Record<string, string> = {
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
        (code.startsWith('FACEBOOK_')
          ? 'Facebook could not connect. Check Page access and Facebook app settings, then try again.'
          : 'Instagram could not connect. Check your professional account and app settings, then try again.')}
    </p>
  );
}
