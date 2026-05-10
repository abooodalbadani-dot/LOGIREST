import { test, expect } from '@playwright/test';

test.describe('Concurrency / Conflict Resolution (409)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ConflictDialog appears when a 409 conflict occurs on update', async ({ page }) => {
    await page.goto('/en/master-data/warehouses/W-001/edit');

    await page.waitForSelector('form');

    const saveButton = page.getByRole('button', { name: /save/i });
    await expect(saveButton).toBeVisible();

    await page.route('**/api/warehouses/W-001', (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Conflict',
          currentVersion: 3,
          originalVersion: 1,
        }),
      })
    );

    await saveButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/conflict/i)).toBeVisible();
  });

  test('ConflictDialog "Reload" button refreshes data and re-enables save', async ({
    page,
  }) => {
    await page.goto('/en/master-data/warehouses/W-001/edit');

    await page.waitForSelector('form');

    await page.route('**/api/warehouses/W-001', (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Conflict',
          currentVersion: 3,
          originalVersion: 1,
        }),
      })
    );

    const saveButton = page.getByRole('button', { name: /save/i });
    await saveButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.route('**/api/warehouses/W-001', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'W-001',
          code: 'MAIN-WH',
          name_en: 'Main Warehouse',
          name_ar: 'المستودع الرئيسي',
          type: 'MAIN',
          branch_id: 'BR-001',
          is_active: true,
          version: 3,
        }),
      })
    );

    const reloadButton = dialog.getByRole('button', { name: /reload/i });
    await reloadButton.click();

    await expect(dialog).not.toBeVisible();

    await expect(saveButton).toBeEnabled();
  });

  test('ConflictDialog "Stay" button dismisses dialog but keeps save disabled (FR-007)', async ({
    page,
  }) => {
    await page.goto('/en/master-data/warehouses/W-001/edit');

    await page.waitForSelector('form');

    await page.route('**/api/warehouses/W-001', (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Conflict',
          currentVersion: 3,
          originalVersion: 1,
        }),
      })
    );

    const saveButton = page.getByRole('button', { name: /save/i });
    await saveButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const stayButton = dialog.getByRole('button', { name: /stay|cancel|close/i });
    await stayButton.click();

    await expect(dialog).not.toBeVisible();

    await expect(saveButton).toBeDisabled();
  });

  test('mutateAsync pattern: redirect only happens after successful mutation', async ({
    page,
  }) => {
    await page.goto('/en/master-data/units-of-measure/UOM-001/edit');

    await page.waitForSelector('form');

    let mutationAttempted = false;
    await page.route('**/api/units-of-measure/UOM-001', (route) => {
      mutationAttempted = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'UOM-001', version: 2 }),
      });
    });

    const saveButton = page.getByRole('button', { name: /save/i });
    await saveButton.click();

    await page.waitForURL('**/master-data/units-of-measure', { timeout: 5000 });
    expect(mutationAttempted).toBe(true);
  });

  test('mutateAsync pattern: no redirect on mutation error', async ({ page }) => {
    await page.goto('/en/master-data/units-of-measure/UOM-001/edit');

    await page.waitForSelector('form');

    await page.route('**/api/units-of-measure/UOM-001', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      })
    );

    const saveButton = page.getByRole('button', { name: /save/i });
    await saveButton.click();

    await page.waitForTimeout(1000);

    expect(page.url()).toContain('/master-data/units-of-measure/UOM-001/edit');
  });
});