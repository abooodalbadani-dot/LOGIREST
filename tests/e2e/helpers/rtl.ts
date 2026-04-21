import { Page } from '@playwright/test';

export async function assertRTL(page: Page) {
  const dir = await page.evaluate(() => document.documentElement.dir);
  if (dir !== 'rtl') throw new Error(`Expected dir=rtl but got dir=${dir}`);
}
