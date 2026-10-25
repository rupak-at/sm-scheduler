import { describe, expect, it } from 'vitest';
import { youtubeSettingsSchema, youtubeSchedulingProblem } from './youtube.js';
const valid = youtubeSettingsSchema.parse({
  title: 'A creator video',
  privacy: 'private',
  madeForKids: false,
  consent: true,
});
describe('YouTube settings', () => {
  it('does not preselect visibility, audience or publishing consent', () => {
    expect(youtubeSettingsSchema.parse({})).toMatchObject({
      privacy: null,
      madeForKids: null,
      consent: false,
    });
  });
  it.each([{ title: '' }, { privacy: null }, { madeForKids: null }, { consent: false }])(
    'rejects incomplete scheduling choices %j',
    (patch) => {
      expect(youtubeSchedulingProblem({ ...valid, ...patch }, 'description')).not.toBe('');
    },
  );
  it('validates descriptions by UTF-8 bytes and rejects unsupported title markup', () => {
    expect(youtubeSchedulingProblem(valid, '😀'.repeat(1300))).toContain('5,000');
    expect(youtubeSchedulingProblem(valid, '<script>')).toContain('angle brackets');
    expect(youtubeSettingsSchema.safeParse({ title: '<script>' }).success).toBe(false);
    expect(youtubeSettingsSchema.safeParse({ title: 'a'.repeat(101) }).success).toBe(false);
    expect(youtubeSchedulingProblem(valid, 'A description #tag')).toBe('');
  });
});
