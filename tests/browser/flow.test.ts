import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createBrowserFixture, webOrigin } from './fixture.js';
import { instagramFixture, testKey } from '../integration/fixtures/instagram.js';
import { AccountTokens } from '../../backend/src/integrations/instagram/account-tokens.js';
import { TokenVault } from '../../backend/src/integrations/instagram/token-crypto.js';
import { createPublicationProcessor } from '../../backend/src/worker/publishing/processor.js';
import { composeAndSave, cancelAndDelete, schedule } from './planner-flow.js';
import { fixtureVideo } from '../integration/fixtures/video.js';
import type { BrowserContext } from 'playwright';

let fixture: Awaited<ReturnType<typeof createBrowserFixture>>;
const creatorEmail = `browser-${randomUUID()}@example.invalid`;
let signedInContext: BrowserContext;
beforeAll(async () => {
  fixture = await createBrowserFixture();
});
afterAll(async () => {
  await fixture?.close();
});

it('runs signup, session proxy, upload, draft, editing, scheduling, publishing, cancellation and logout', async () => {
  const page = await fixture.browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.name));
  // No navigation/request may contact live providers during this fixture run.
  await page.route(/https:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort());
  await page.goto(`${webOrigin}/planner`);
  await page.waitForURL('**/login');
  await page.goto(`${webOrigin}/signup`);
  await page.getByLabel('Your name').fill('Regression Creator');
  await page.getByLabel('Email address').fill(creatorEmail);
  await page.getByLabel('Password', { exact: true }).fill('browser-test-passphrase-42');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.waitForURL('**/planner');
  const profile = await page.request.get(`${webOrigin}/api/auth/get-session`);
  expect(profile.status()).toBe(200);
  const { user } = await profile.json();
  fixture.users.push({ id: user.id, channelId: '', mediaId: '', cookie: '' });
  const provider = instagramFixture();
  const vault = new TokenVault(testKey);
  await fixture.db.socialAccount.create({
    data: {
      userId: user.id,
      provider: 'INSTAGRAM',
      providerAccountId: provider.state.accountId,
      displayName: 'Regression channel',
      status: 'CONNECTED',
      tokenCiphertext: vault.seal('long-secret', provider.state.accountId),
      tokenExpiresAt: new Date(Date.now() + 86400000),
      tokenRefreshedAt: new Date(),
    },
  });
  await page.reload();
  const photo = await sharp({
    create: { width: 640, height: 800, channels: 3, background: '#ddd' },
  })
    .png()
    .toBuffer();
  await composeAndSave(page, photo);
  const post = await fixture.db.post.findFirstOrThrow({
    where: { userId: user.id },
    include: { publications: true },
  });
  const publication = post.publications[0]!;
  await fixture.db.publication.update({
    where: { id: publication.id },
    data: { scheduledAt: new Date(0) },
  });
  const processPublication = createPublicationProcessor({
    db: fixture.db,
    storage: fixture.storage,
    client: provider.client,
    tokens: new AccountTokens(fixture.db, provider.client, vault),
  });
  await Promise.all([processPublication(publication.id), processPublication(publication.id)]);
  expect(provider.state.publishCalls).toBe(1);
  await page.goto(`${webOrigin}/planner?view=published`);
  await page.getByText('Edited regression caption', { exact: false }).waitFor();
  await cancelAndDelete(page, photo);
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.waitForURL('**/login');
  await page.goto(`${webOrigin}/planner`);
  await page.waitForURL('**/login');
  expect(errors).toEqual([]);
  await page.close();
});

it('logs in, rejects a wrong password and invalid media, then uploads and schedules an actual MP4', async () => {
  signedInContext = await fixture.browser.newContext();
  const page = await signedInContext.newPage();
  await page.goto(`${webOrigin}/login`);
  await page.getByLabel('Email address').fill(creatorEmail);
  await page.getByLabel('Password', { exact: true }).fill('incorrect-passphrase');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.locator('#auth-error').filter({ hasText: /.+/ }).waitFor();
  await page.getByLabel('Password', { exact: true }).fill('browser-test-passphrase-42');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.waitForURL('**/planner');
  await page.getByRole('link', { name: 'New post', exact: true }).click();
  await page.locator('#media-file').setInputFiles({
    name: 'corrupt.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('corrupt-photo'),
  });
  await page
    .getByText('This photo could not be read. Choose a still JPEG, PNG, WebP, or AVIF.', {
      exact: true,
    })
    .waitFor();
  const video = await fixtureVideo();
  await page
    .locator('#media-file')
    .setInputFiles({ name: 'regression.mp4', mimeType: 'video/mp4', buffer: video });
  await page.getByText('regression.mp4 · Ready', { exact: true }).waitFor();
  await page.getByLabel('Caption', { exact: true }).fill('Actual MP4 regression');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.waitForURL('**/planner?view=drafts');
  await page.getByRole('link', { name: 'Edit post', exact: true }).click();
  expect(await page.locator('video').count()).toBeGreaterThan(0);
  await schedule(page);
  await page.waitForURL('**/planner?view=scheduled');
  await page.getByText('Actual MP4 regression', { exact: true }).first().waitFor();
  await page.close();
});

it('keeps public, auth, planner and composer layouts within all required viewport widths', async () => {
  for (const width of [320, 390, 768, 820, 1024, 1280, 1440, 1920]) {
    const page = await fixture.browser.newPage({ viewport: { width, height: 900 } });
    for (const path of ['/', '/login', '/signup']) {
      await page.goto(`${webOrigin}${path}`);
      expect(await page.evaluate('document.documentElement.scrollWidth <= innerWidth')).toBe(true);
    }
    await page.close();
    const planner = await signedInContext.newPage();
    await planner.setViewportSize({ width, height: 900 });
    await planner.goto(`${webOrigin}/planner`);
    await planner.getByRole('link', { name: 'New post', exact: true }).click();
    await planner.getByRole('dialog').waitFor();
    expect(await planner.evaluate('document.documentElement.scrollWidth <= innerWidth')).toBe(true);
    await planner.close();
  }
});
