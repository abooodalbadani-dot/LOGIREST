import { test, expect } from '@playwright/test';

test.describe('Unsaved Changes Guard (SC-001, SC-003)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('SC-001: Navigating away from a dirty form triggers the confirmation dialog', async ({
    page,
  }) => {
    await page.goto('/en/master-data/units-of-measure/new');
    await page.waitForSelector('form');

    const codeInput = page.getByPlaceholder(/code|CODE/i).first();
    await codeInput.fill('TESTUOM');

    const dialog = page.getByRole('dialog');
    await expect(dialog).not.toBeVisible();

    await page.getByRole('link', { name: /units.of.measure|uom/i }).first().click().catch(() => {
      // Link click intercepted by guard
    });

    await expect(dialog).toBeVisible();
    await expect(page.getByText(/unsaved changes/i)).toBeVisible();
  });

  test('SC-003: After successful form submission, navigating away does NOT trigger the dialog', async ({
    page,
  }) => {
    await page.goto('/en/master-data/units-of-measure/new');
    await page.waitForSelector('form');

    const codeInput = page.getByPlaceholder(/code|CODE/i).first();
    await codeInput.fill('TESTUOM');

    const nameEn = page.getByPlaceholder(/name.*en/i).first();
    await nameEn.fill('Test Unit');

    const nameAr = page.getByPlaceholder(/name.*ar/i).first();
    await nameAr.fill('وحدة اختبار');

    const saveButton = page.getByRole('button', { name: /save/i }).first();
    await saveButton.click();

    await page.waitForURL('**/master-data/units-of-measure', { timeout: 10000 });

    const dialog = page.getByRole('dialog');
    await expect(dialog).not.toBeVisible();
  });

  test('Clicking "Stay on Page" in the dialog keeps the user on the current form', async ({
    page,
  }) => {
    await page.goto('/en/master-data/units-of-measure/new');
    await page.waitForSelector('form');

    const codeInput = page.getByPlaceholder(/code|CODE/i).first();
    await codeInput.fill('STAYTEST');

    await page.getByRole('link', { name: /dashboard/i }).first().click().catch(() => {});

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const stayButton = page.getByRole('button', { name: /stay/i });
    await stayButton.click();

    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/units-of-measure/);
  });

  test('Clicking "Discard & Leave" navigates the user away', async ({ page }) => {
    await page.goto('/en/master-data/warehouses/new');
    await page.waitForSelector('form');

    const codeInput = page.getByPlaceholder(/code|CODE/i).first();
    await codeInput.fill('DISCARDTEST');

    await page.getByRole('link', { name: /dashboard/i }).first().click().catch(() => {});

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const leaveButton = page.getByRole('button', { name: /discard|leave/i });
    await leaveButton.click();

    await expect(page).not.toHaveURL(/warehouses/);
  });

  test('Cancel button with skipGuard bypasses the dialog', async ({ page }) => {
    await page.goto('/en/master-data/warehouses/new');
    await page.waitForSelector('form');

    const codeInput = page.getByPlaceholder(/code|CODE/i).first();
    await codeInput.fill('CANCELTEST');

    const cancelButton = page.getByRole('button', { name: /cancel/i }).first();
    await cancelButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).not.toBeVisible();

    await expect(page).not.toHaveURL(/warehouses\/new/);
  });

  test('Browser back button triggers the dialog when form is dirty', async ({
    page,
  }) => {
    await page.goto('/en/master-data/warehouses');
    await page.goto('/en/master-data/warehouses/new');
    await page.waitForSelector('form');

    const codeInput = page.getByPlaceholder(/code|CODE/i).first();
    await codeInput.fill('BACKTEST');

    await page.goBack().catch(() => {});

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
  });

  test('RTL: Dialog renders correctly in Arabic locale', async ({ page }) => {
    await page.goto('/ar/master-data/units-of-measure/new');
    await page.waitForSelector('form');

    const codeInput = page.getByPlaceholder(/код|CODE/i).first();
    await codeInput.fill('RTLTEST');

    await page.getByRole('link', { name: /dashboard/i }).first().click().catch(() => {});

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const dialogContent = dialog.locator('..');
    const direction = await dialogContent.evaluate(
      (el) => getComputedStyle(el).direction
    );
    expect(direction).toBe('rtl');
  });
});