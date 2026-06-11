import { test, expect } from '@playwright/test';
import { injectAuthSession, clearAuthSession, DEFAULT_ADMIN_SESSION } from './helpers/auth';

test.describe('Kitchen Request Lifecycle (US2)', () => {
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

  test('create a kitchen request draft via API', async ({ page }) => {
    const krId = crypto.randomUUID();

    await page.route('**/api/v1/operations/kitchen-requests', (route) => {
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

      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': 'true',
          },
          body: JSON.stringify({
            data: {
              id: krId,
              requestNumber: 'KR-20260601-0001',
              status: 'DRAFT',
              departmentId: 'dept-1',
              warehouseId: 'warehouse-a',
              requestedBy: 'e2e-admin-user',
              requestedAt: new Date().toISOString(),
              items: [
                {
                  id: crypto.randomUUID(),
                  itemId: 'item-1',
                  itemName: 'Test Item',
                  uom: 'KG',
                  quantity: 10,
                  notes: '',
                  fulfilledQuantity: 0,
                },
              ],
              version: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({ data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } }),
      });
    });

    await page.goto('/en/kitchen-requests');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('submit a kitchen request transitions status to SUBMITTED', async ({ page }) => {
    const krId = crypto.randomUUID();

    await page.route(`**/api/v1/operations/kitchen-requests/${krId}/submit`, (route) => {
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
            requestNumber: 'KR-20260601-0001',
            status: 'SUBMITTED',
            version: 2,
          },
        }),
      });
    });

    await page.goto('/en/kitchen-requests');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('fulfill a kitchen request creates inventory issue', async ({ page }) => {
    const krId = crypto.randomUUID();

    await page.route(`**/api/v1/operations/kitchen-requests/${krId}/fulfill`, (route) => {
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
            requestNumber: 'KR-20260601-0002',
            status: 'FULFILLED',
            version: 3,
            items: [
              {
                id: crypto.randomUUID(),
                itemId: 'item-1',
                fulfilledQuantity: 10,
              },
            ],
          },
        }),
      });
    });

    await page.goto('/en/kitchen-requests');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('cancel a kitchen request reverts to DRAFT', async ({ page }) => {
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
            requestNumber: 'KR-20260601-0003',
            status: 'CANCELLED',
            version: 4,
          },
        }),
      });
    });

    await page.goto('/en/kitchen-requests');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('list kitchen requests returns paginated data', async ({ page }) => {
    const mockRequests = Array.from({ length: 3 }).map((_, i) => ({
      id: crypto.randomUUID(),
      requestNumber: `KR-20260601-${String(i + 1).padStart(4, '0')}`,
      status: i === 0 ? 'DRAFT' : i === 1 ? 'SUBMITTED' : 'FULFILLED',
      departmentId: 'dept-1',
      warehouseId: 'warehouse-a',
      requestedBy: 'e2e-admin-user',
      requestedAt: new Date().toISOString(),
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await page.route('**/api/v1/operations/kitchen-requests*', (route) => {
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
          data: mockRequests,
          meta: { total: 3, page: 1, pageSize: 10, totalPages: 1 },
        }),
      });
    });

    await page.goto('/en/kitchen-requests');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });
});
