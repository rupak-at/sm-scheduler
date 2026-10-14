import type { Channel } from '@social-scheduler/shared';

export function channelName(channel: Channel | undefined): string {
  if (!channel) return 'Selected account';
  return channel.provider !== 'INSTAGRAM'
    ? (channel.displayName ?? (channel.provider === 'TIKTOK' ? 'TikTok account' : 'Facebook Page'))
    : `@${channel.displayName ?? 'Instagram'}`;
}
export function channelProvider(channel: Channel | undefined): string {
  return channel?.provider === 'TIKTOK'
    ? 'TikTok'
    : channel?.provider === 'FACEBOOK'
      ? 'Facebook'
      : 'Instagram';
}
