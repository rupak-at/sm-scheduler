import { describe, expect, it } from 'vitest';
import { captionWithHashtags, splitCaption } from './caption.js';
import { postInputSchema } from './scheduler.js';

describe('Captions and authored hashtags', () => {
  it('normalizes tags and preserves authored caption paragraphs', () => {
    const text = captionWithHashtags(
      'A new idea\n\nFrom my studio',
      ' #photo, नेपाल creator_2026 ',
    );
    expect(text).toBe('A new idea\n\nFrom my studio\n\n#photo #नेपाल #creator_2026');
    const parts = splitCaption(text);
    expect(parts).toEqual({
      caption: 'A new idea\n\nFrom my studio',
      hashtags: '#photo #नेपाल #creator_2026',
    });
    expect(captionWithHashtags(parts.caption, parts.hashtags)).toBe(text);
  });
  it('leaves ordinary paragraphs and untagged trailing whitespace in the caption', () => {
    expect(splitCaption('Hello\n\nAnother paragraph')).toEqual({
      caption: 'Hello\n\nAnother paragraph',
      hashtags: '',
    });
    expect(captionWithHashtags('Hello\n\n', '')).toBe('Hello\n\n');
    expect(splitCaption('Hello\n\n')).toEqual({ caption: 'Hello\n\n', hashtags: '' });
    expect(splitCaption('  ')).toEqual({ caption: '  ', hashtags: '' });
  });
  it('restores a hashtag-only post into the hashtag field', () => {
    const text = captionWithHashtags('', 'नेपाल photo');
    const parts = splitCaption(text);
    expect(parts).toEqual({ caption: '', hashtags: '#नेपाल #photo' });
    expect(captionWithHashtags(parts.caption, parts.hashtags)).toBe(text);
  });
  it.each(['bad-tag', '#', '###tag', '#emoji😀'])('rejects invalid hashtag input %s', (tags) => {
    expect(() => captionWithHashtags('Caption', tags)).toThrow('Use letters');
  });
  it('counts appended hashtags against the server caption limit', () => {
    const caption = captionWithHashtags('a'.repeat(2195), 'travel');
    expect(postInputSchema.shape.caption.safeParse(caption).success).toBe(false);
  });
});
