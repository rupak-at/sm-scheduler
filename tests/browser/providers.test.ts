import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import type { Page } from 'playwright';
import { createBrowserFixture, webOrigin } from './fixture.js';
import { fixtureVideo } from '../integration/fixtures/video.js';
import { createPublicationProcessor } from '../../backend/src/worker/publishing/processor.js';

it.each(['TIKTOK', 'YOUTUBE'] as const)(
  'connects %s, preserves draft settings, resets consent, and completes a scheduled video',
  async (provider) => {
    const fixture = await createBrowserFixture(provider);
    try {
      const page = await fixture.browser.newPage({ viewport: { width: 1280, height: 900 } });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.name));
      await signup(page);
      const session = await (await page.request.get(`${webOrigin}/api/auth/get-session`)).json();
      fixture.users.push({ id: session.user.id, channelId: '', mediaId: '', cookie: '' });
      await page.route(
        provider === 'YOUTUBE' ? 'https://accounts.google.com/**' : 'https://www.tiktok.com/**',
        async (route) => {
          const state = new URL(route.request().url()).searchParams.get('state')!;
          await route.fulfill({
            status: 302,
            headers: {
              location: `${webOrigin}/api/auth/${provider.toLowerCase()}/callback?${new URLSearchParams({ state, code: 'fixture-code' })}`,
            },
          });
        },
      );
      await page
        .getByRole('button', {
          name: provider === 'YOUTUBE' ? 'Connect YouTube' : 'Connect TikTok',
          exact: true,
        })
        .click();
      await page.waitForURL(`**/planner?connection=${provider}_connected`);
      await compose(page, provider);
      await page.getByRole('button', { name: 'Save draft', exact: true }).click();
      await page.waitForURL('**/planner?view=drafts');
      await page.getByRole('link', { name: 'Edit post', exact: true }).click();
      expect(await page.locator(`#${provider.toLowerCase()}-consent`).isChecked()).toBe(false);
      if (provider === 'YOUTUBE')
        expect(await page.getByLabel('Video title', { exact: true }).inputValue()).toBe(
          'A real scheduled YouTube video',
        );
      await checkLayouts(page, provider);
      const time = new Date(Date.now() + 300000);
      await page
        .getByLabel('Publish date and time')
        .fill(
          new Date(time.getTime() - time.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        );
      await page.locator(`#${provider.toLowerCase()}-consent`).check();
      await page.getByRole('button', { name: 'Schedule post', exact: true }).click();
      await page.waitForURL('**/planner?view=scheduled');
      const publication = await fixture.db.publication.findFirstOrThrow({
        where: { post: { userId: session.user.id } },
      });
      await fixture.db.publication.update({
        where: { id: publication.id },
        data: { scheduledAt: new Date(0) },
      });
      const processor = createPublicationProcessor({
        db: fixture.db,
        storage: fixture.storage,
        ...(fixture.tiktok ? { tiktok: fixture.tiktok } : {}),
        ...(fixture.youtube ? { youtube: fixture.youtube } : {}),
      });
      await Promise.all([processor(publication.id), processor(publication.id)]);
      expect(
        (await fixture.db.publication.findUniqueOrThrow({ where: { id: publication.id } })).status,
      ).toBe('PUBLISHED');
      await page.goto(`${webOrigin}/planner?view=published`);
      await page
        .getByText('Provider regression caption changed', { exact: false })
        .first()
        .waitFor();
      expect(errors).toEqual([]);
    } finally {
      await fixture.close();
    }
  },
);

async function signup(page: Page) {
  await page.goto(`${webOrigin}/signup`);
  await page.getByLabel('Your name').fill('Provider regression');
  await page.getByLabel('Email address').fill(`provider-${randomUUID()}@example.invalid`);
  await page.getByLabel('Password', { exact: true }).fill('provider-test-passphrase-42');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.waitForURL('**/planner');
}
async function compose(page: Page, provider: 'TIKTOK' | 'YOUTUBE') {
  await page.getByRole('link', { name: 'New post', exact: true }).click();
  const privacy = provider === 'YOUTUBE' ? '#youtube-privacy' : '#tiktok-privacy';
  expect(await page.locator(privacy).inputValue()).toBe('');
  expect(await page.locator(`#${provider.toLowerCase()}-consent`).isChecked()).toBe(false);
  const video = await fixtureVideo(3, '480x854');
  await page
    .locator('#media-file')
    .setInputFiles({ name: 'provider.mp4', mimeType: 'video/mp4', buffer: video });
  await page.getByText('provider.mp4 · Ready', { exact: true }).waitFor();
  await page.getByLabel('Caption', { exact: true }).fill('Provider regression caption');
  await page.locator(privacy).selectOption(provider === 'YOUTUBE' ? 'private' : 'SELF_ONLY');
  if (provider === 'YOUTUBE') {
    expect(await page.locator('#youtube-audience').inputValue()).toBe('');
    await page.getByLabel('Video title', { exact: true }).fill('A real scheduled YouTube video');
    await page.locator('#youtube-audience').selectOption('false');
  }
  await page.locator(`#${provider.toLowerCase()}-consent`).check();
  await page.getByLabel('Caption', { exact: true }).fill('Provider regression caption changed');
  expect(await page.locator(`#${provider.toLowerCase()}-consent`).isChecked()).toBe(false);
}
async function checkLayouts(page: Page, provider: string) {
  for (const width of [320, 390, 768, 820, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate('document.documentElement.scrollWidth <= innerWidth')).toBe(true);
    if ([390, 820, 1440].includes(width)) {
      await page
        .getByRole('heading', {
          name: provider === 'YOUTUBE' ? 'YouTube video settings' : 'TikTok posting settings',
          exact: true,
        })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `/tmp/social-scheduler-${provider.toLowerCase()}-${width}.png`,
        fullPage: true,
      });
    }
  }
}
