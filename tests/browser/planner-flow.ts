import { expect } from 'vitest';
import type { Page } from 'playwright';
import { webOrigin } from './fixture.js';

async function upload(page: Page, photo: Buffer) {
  await page.getByRole('link', { name: 'New post', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByText('Add a photo or video before saving.', { exact: true }).waitFor();
  await page
    .locator('#media-file')
    .setInputFiles({ name: 'regression.png', mimeType: 'image/png', buffer: photo });
  await page.getByText('regression.png · Ready', { exact: true }).waitFor();
}

export async function composeAndSave(page: Page, photo: Buffer) {
  await upload(page, photo);
  await page.getByLabel('Caption', { exact: true }).fill('Regression caption');
  await page.getByLabel('Hashtags', { exact: true }).fill('#regression');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.waitForURL('**/planner?view=drafts');
  await page.getByRole('link', { name: 'Edit post', exact: true }).click();
  expect(await page.getByLabel('Caption', { exact: true }).inputValue()).toBe('Regression caption');
  expect(await page.getByLabel('Hashtags', { exact: true }).inputValue()).toBe('#regression');
  await page.getByLabel('Caption', { exact: true }).fill('Edited regression caption');
  await schedule(page);
}

export async function schedule(page: Page) {
  const time = new Date(Date.now() + 300000);
  const local = new Date(time.getTime() - time.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  await page.getByLabel('Publish date and time').fill(local);
  await page.getByRole('button', { name: 'Schedule post', exact: true }).click();
  await page.waitForURL('**/planner?view=scheduled');
}

export async function cancelAndDelete(page: Page, photo: Buffer) {
  await page.goto(`${webOrigin}/planner?view=drafts`);
  await upload(page, photo);
  await page.getByLabel('Caption', { exact: true }).fill('Disposable cancellation draft');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.waitForURL('**/planner?view=drafts');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'More post actions' }).click();
  await page.getByRole('menuitem', { name: 'Cancel post' }).click();
  await page.getByText('Cancelled', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'More post actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete draft' }).click();
  await page
    .getByText('Disposable cancellation draft', { exact: true })
    .waitFor({ state: 'detached' });
}
