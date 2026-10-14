import { describe, expect, it } from 'vitest';
import { tiktokSettingsSchema } from '@social-scheduler/shared';
import { validateTikTokSettings } from './validation.js';
const settings = tiktokSettingsSchema.parse({ privacy: 'SELF_ONLY', consent: true });
const creator = {
  creator_username: 'creator',
  creator_nickname: 'Creator',
  privacy_level_options: ['SELF_ONLY' as const, 'MUTUAL_FOLLOW_FRIENDS' as const],
  comment_disabled: false,
  duet_disabled: false,
  stitch_disabled: true,
  max_video_post_duration_sec: 300,
};
const media = { type: 'VIDEO', width: 720, height: 1280, durationSeconds: 30 };

describe('TikTok per-post approval and creator limits', () => {
  it('has no implicit privacy or interaction permissions and requires consent to schedule', () => {
    const empty = tiktokSettingsSchema.parse({});
    expect(empty).toMatchObject({
      privacy: null,
      allowComment: false,
      allowDuet: false,
      allowStitch: false,
      consent: false,
    });
    expect(() => validateTikTokSettings(empty, creator, false, media)).toThrow('CONSENT_REQUIRED');
    expect(() =>
      validateTikTokSettings({ ...empty, consent: true }, creator, false, media),
    ).toThrow('PRIVACY_SELECTION_REQUIRED');
    expect(() => validateTikTokSettings(settings, creator, false, media)).not.toThrow();
  });
  it('enforces unaudited private accounts and visibility without silently changing choices', () => {
    expect(() =>
      validateTikTokSettings(
        { ...settings, privacy: 'MUTUAL_FOLLOW_FRIENDS' },
        creator,
        false,
        media,
      ),
    ).toThrow('PRIVATE_TEST_ACCOUNT_REQUIRED');
    expect(() =>
      validateTikTokSettings(
        settings,
        { ...creator, privacy_level_options: ['SELF_ONLY', 'PUBLIC_TO_EVERYONE'] },
        false,
        media,
      ),
    ).toThrow('PRIVATE_TEST_ACCOUNT_REQUIRED');
    expect(() =>
      validateTikTokSettings(
        { ...settings, privacy: 'MUTUAL_FOLLOW_FRIENDS' },
        creator,
        true,
        media,
      ),
    ).not.toThrow();
  });
});

describe('TikTok media and disclosure eligibility', () => {
  it.each([
    { ...media, durationSeconds: 301 },
    { ...media, durationSeconds: null },
    { ...media, width: 320 },
    { ...media, durationSeconds: -1 },
  ])('rejects unsupported or unknown video dimensions/duration before sending', (invalid) => {
    expect(() => validateTikTokSettings(settings, creator, true, invalid)).toThrow(
      'VIDEO_EXCEEDS_CREATOR_LIMITS',
    );
  });
  it('requires current interaction permission and shows no Duet/Stitch for photos', () => {
    expect(() =>
      validateTikTokSettings({ ...settings, allowStitch: true }, creator, true, media),
    ).toThrow('INTERACTION_SETTINGS_CHANGED');
    expect(() =>
      validateTikTokSettings(
        { ...settings, allowComment: true },
        { ...creator, comment_disabled: true },
        true,
        media,
      ),
    ).toThrow('INTERACTION_SETTINGS_CHANGED');
    expect(() =>
      validateTikTokSettings({ ...settings, allowDuet: true }, creator, true, {
        ...media,
        type: 'IMAGE',
      }),
    ).toThrow('PHOTO_INTERACTIONS_INVALID');
  });
  it('requires consistent commercial disclosures and prevents private paid partnerships', () => {
    expect(() =>
      validateTikTokSettings({ ...settings, commercial: true }, creator, true, media),
    ).toThrow('COMMERCIAL_DISCLOSURE_REQUIRED');
    expect(() =>
      validateTikTokSettings({ ...settings, ownBrand: true }, creator, true, media),
    ).toThrow('COMMERCIAL_DISCLOSURE_REQUIRED');
    expect(() =>
      validateTikTokSettings(
        { ...settings, commercial: true, brandedContent: true },
        creator,
        true,
        media,
      ),
    ).toThrow('BRANDED_CONTENT_CANNOT_BE_PRIVATE');
    expect(() =>
      validateTikTokSettings(
        { ...settings, commercial: true, ownBrand: true },
        creator,
        true,
        media,
      ),
    ).not.toThrow();
  });
});
