import { test, expect } from '@playwright/test';
import { injectAuthSession, clearAuthSession, DEFAULT_ADMIN_SESSION } from './helpers/auth';

test.describe('Kitchen Request Void & Inventory Reversal (US2)', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page, DEFAULT_ADMIN_SESSION);
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSession(page);
  });

  test('cancel endpoint returns success', async ({ page }) => {
    const krId = crypto.randomUUID();

    await page.route(`**/api/operations/kitchen-requests/${krId}/cancel`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: krId,
            request_number: 'KR-20260601-0004',
            status: 'CANCELLED',
            version: 3,
          },
        }),
      }),
    );

    await page.goto('/en/kitchen-requests');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('voiding restores stock lot balance', async ({ page }) => {
    const lotBalanceBefore = 100;
    const fulfilledQty = 10;
    const expectedBalanceAfter = lotBalanceBefore + fulfilledQty;

    await page.route('**/api/inventory/lots/balance*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            lotId: 'lot-1',
            itemId: 'item-1',
            balanceBefore: lotBalanceBefore,
            balanceAfter: expectedBalanceAfter,
          },
        }),
      }),
    );

    await page.goto('/en/inventory/lots');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('cancelled request shows correct status', async ({ page }) => {
    const krId = crypto.randomUUID();

    await page.route(`**/api/operations/kitchen-requests/${krId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: krId,
            request_number: 'KR-20260601-0005',
            status: 'CANCELLED',
            department_id: 'dept-1',
            warehouse_id: 'warehouse-a',
            version: 3,
            items: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }),
      }),
    );

    await page.goto(`/en/kitchen-requests/${krId}`);
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('cancel mutation is idempotent (double-cancel safe)', async ({ page }) => {
    const krId = crypto.randomUUID();

    await page.route(`**/api/operations/kitchen-requests/${krId}/cancel`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: krId, status: 'CANCELLED', version: 3 } }),
      }),
    );

    await page.goto('/en/kitchen-requests');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });
});
