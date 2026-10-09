const messages: Record<string, string> = {
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
        'Instagram could not connect. Check your professional account and app settings, then try again.'}
    </p>
  );
}
