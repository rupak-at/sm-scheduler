import type { Channel } from '@social-scheduler/shared';

export function channelName(channel: Channel | undefined): string {
  if (!channel) return 'Selected account';
  return channel.provider === 'FACEBOOK'
    ? (channel.displayName ?? 'Facebook Page')
    : `@${channel.displayName ?? 'Instagram'}`;
}
export function channelProvider(channel: Channel | undefined): string {
  return channel?.provider === 'FACEBOOK' ? 'Facebook' : 'Instagram';
}
