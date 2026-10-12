import { useState } from 'react';
import { captionWithHashtags, splitCaption } from '@social-scheduler/shared';

export function useCaption(initial: string) {
  const [parts, setParts] = useState(() => splitCaption(initial));
  let composedCaption = [parts.caption, parts.hashtags].filter(Boolean).join('\n\n');
  let captionProblem = '';
  try {
    composedCaption = captionWithHashtags(parts.caption, parts.hashtags);
    if (composedCaption.length > 2200)
      captionProblem = 'Keep your caption and hashtags within 2,200 characters.';
  } catch (error) {
    captionProblem = error instanceof Error ? error.message : 'Check your hashtags.';
  }
  return {
    ...parts,
    composedCaption,
    captionProblem,
    setCaption: (caption: string) => setParts((previous) => ({ ...previous, caption })),
    setHashtags: (hashtags: string) => setParts((previous) => ({ ...previous, hashtags })),
  };
}
