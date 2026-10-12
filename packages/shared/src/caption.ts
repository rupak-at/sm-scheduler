const tagPattern = /^#[\p{L}\p{M}\p{N}_]+$/u;

export function captionWithHashtags(caption: string, hashtags: string): string {
  const tags = hashtags
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
  if (tags.some((tag) => !tagPattern.test(tag)))
    throw new Error('Use letters, numbers, and underscores in hashtags, separated by spaces.');
  return tags.length ? [caption.trimEnd(), tags.join(' ')].filter(Boolean).join('\n\n') : caption;
}

export function splitCaption(caption: string): { caption: string; hashtags: string } {
  const index = caption.lastIndexOf('\n\n');
  const block = index === -1 ? caption : caption.slice(index + 2);
  if (
    block.trim().length &&
    block
      .split(/\s+/)
      .filter(Boolean)
      .every((tag) => tagPattern.test(tag))
  )
    return { caption: index === -1 ? '' : caption.slice(0, index), hashtags: block };
  return { caption, hashtags: '' };
}
