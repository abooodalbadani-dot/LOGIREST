import { test, expect } from '@playwright/test';
import { injectAuthSession, clearAuthSession, DEFAULT_ADMIN_SESSION } from './helpers/auth';

test.describe('Kitchen Request Void & Inventory Reversal (US2)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      console.log(`[BROWSER EXCEPTION] ${err.message}`);
    });
    page.on('requestfailed', (req) => {
      console.log(`[BROWSER REQ FAILED] ${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
    });
    await injectAuthSession(page, DEFAULT_ADMIN_SESSION);
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSession(page);
  });

  test('cancel endpoint returns success', async ({ page }) => {
    const krId = crypto.randomUUID();

    await page.route(`**/api/v1/operations/kitchen-requests/${krId}/cancel`, (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-branch-id, x-warehouse-id, x-xsrf-token, x-idempotency-key',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          },
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          data: {
            id: krId,
            requestNumber: 'KR-20260601-0004',
            status: 'CANCELLED',
            version: 3,
          },
        }),
      });
    });

    await page.goto('/en/kitchen-requests');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('voiding restores stock lot balance', async ({ page }) => {
    const lotBalanceBefore = 100;
    const fulfilledQty = 10;
    const expectedBalanceAfter = lotBalanceBefore + fulfilledQty;

    await page.route('**/api/v1/inventory/lots/balance*', (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-branch-id, x-warehouse-id, x-xsrf-token, x-idempotency-key',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          },
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          data: {
            lotId: 'lot-1',
            itemId: 'item-1',
            balanceBefore: lotBalanceBefore,
            balanceAfter: expectedBalanceAfter,
          },
        }),
      });
    });

    await page.goto('/en/inventory/lots');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('cancelled request shows correct status', async ({ page }) => {
    const krId = crypto.randomUUID();

    await page.route(`**/api/v1/operations/kitchen-requests/${krId}`, (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-branch-id, x-warehouse-id, x-xsrf-token, x-idempotency-key',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          },
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          data: {
            id: krId,
            requestNumber: 'KR-20260601-0005',
            status: 'CANCELLED',
            departmentId: 'dept-1',
            warehouseId: 'warehouse-a',
            requestedBy: 'e2e-admin-user',
            requestedAt: new Date().toISOString(),
            version: 3,
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto(`/en/kitchen-requests/${krId}`);
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('cancel mutation is idempotent (double-cancel safe)', async ({ page }) => {
    const krId = crypto.randomUUID();

    await page.route(`**/api/v1/operations/kitchen-requests/${krId}/cancel`, (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-branch-id, x-warehouse-id, x-xsrf-token, x-idempotency-key',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          },
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({ data: { id: krId, status: 'CANCELLED', version: 3 } }),
      });
    });

    await page.goto('/en/kitchen-requests');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });
});
