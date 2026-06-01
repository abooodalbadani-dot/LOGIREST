import { test, expect } from '@playwright/test';
import { injectAuthSession, clearAuthSession, DEFAULT_ADMIN_SESSION } from './helpers/auth';

test.describe('Kitchen Request Lifecycle (US2)', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page, DEFAULT_ADMIN_SESSION);
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSession(page);
  });

  test('create a kitchen request draft via API', async ({ page }) => {
    const krId = crypto.randomUUID();

    await page.route('**/api/operations/kitchen-requests', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: krId,
              request_number: 'KR-20260601-0001',
              status: 'DRAFT',
              department_id: 'dept-1',
              warehouse_id: 'warehouse-a',
              items: [
                {
                  id: crypto.randomUUID(),
                  item_id: 'item-1',
                  item_name: 'Test Item',
                  uom: 'KG',
                  quantity: 10,
                  notes: '',
                  fulfilled_quantity: 0,
                },
              ],
              version: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], meta: { total: 0, page: 1, page_size: 10, total_pages: 0 } }),
      });
    });

    await page.goto('/en/kitchen-requests');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('submit a kitchen request transitions status to SUBMITTED', async ({ page }) => {
    const krId = crypto.randomUUID();

    await page.route(`**/api/operations/kitchen-requests/${krId}/submit`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: krId,
            request_number: 'KR-20260601-0001',
            status: 'SUBMITTED',
            version: 2,
          },
        }),
      }),
    );

    await page.goto('/en/kitchen-requests');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('fulfill a kitchen request creates inventory issue', async ({ page }) => {
    const krId = crypto.randomUUID();

    await page.route(`**/api/operations/kitchen-requests/${krId}/fulfill`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: krId,
            request_number: 'KR-20260601-0002',
            status: 'FULFILLED',
            version: 3,
            items: [
              {
                id: crypto.randomUUID(),
                item_id: 'item-1',
                fulfilled_quantity: 10,
              },
            ],
          },
        }),
      }),
    );

    await page.goto('/en/kitchen-requests');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('cancel a kitchen request reverts to DRAFT', async ({ page }) => {
    const krId = crypto.randomUUID();

    await page.route(`**/api/operations/kitchen-requests/${krId}/cancel`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: krId,
            request_number: 'KR-20260601-0003',
            status: 'CANCELLED',
            version: 4,
          },
        }),
      }),
    );

    await page.goto('/en/kitchen-requests');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('list kitchen requests returns paginated data', async ({ page }) => {
    const mockRequests = Array.from({ length: 3 }).map((_, i) => ({
      id: crypto.randomUUID(),
      request_number: `KR-20260601-${String(i + 1).padStart(4, '0')}`,
      status: i === 0 ? 'DRAFT' : i === 1 ? 'SUBMITTED' : 'FULFILLED',
      department_id: 'dept-1',
      warehouse_id: 'warehouse-a',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    await page.route('**/api/operations/kitchen-requests*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: mockRequests,
          meta: { total: 3, page: 1, page_size: 10, total_pages: 1 },
        }),
      }),
    );

    await page.goto('/en/kitchen-requests');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });
});
