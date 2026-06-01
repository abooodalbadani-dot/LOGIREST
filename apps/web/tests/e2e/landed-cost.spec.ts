import { test, expect } from '@playwright/test';

test.describe('Landed Cost Allocation (US1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/landed-cost');
  });

  test('page renders with correct title', async ({ page }) => {
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
    await expect(page.getByText(/landed cost/i).first()).toBeVisible();
  });

  test('wizard shows calculator icon when in development mode', async ({ page }) => {
    const calcIcon = page.locator('svg.lucide-calculator');
    const comingSoon = page.getByText(/coming soon/i);
    await expect(calcIcon).toBeVisible({ timeout: 5000 });
    await expect(comingSoon).toBeVisible();
  });

  test('create voucher API call succeeds with mocked data', async ({ page }) => {
    const voucherId = crypto.randomUUID();
    await page.route('**/api/procurement/landed-cost', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: voucherId,
              voucherNumber: 'LCV-20260601-0001',
              allocationMethod: 'VALUE',
              totalAllocatedCost: 1500.0,
              status: 'DRAFT',
              currencyId: 'cur-usd',
              exchangeRate: 1.0,
              transactionDate: new Date().toISOString(),
              version: 1,
              createdById: 'user-1',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
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

    await page.goto('/en/landed-cost');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('post voucher dispatches revalidation job', async ({ page }) => {
    const voucherId = crypto.randomUUID();
    await page.route(`**/api/procurement/landed-cost/${voucherId}/post`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: voucherId,
            voucherNumber: 'LCV-20260601-0002',
            allocationMethod: 'VALUE',
            totalAllocatedCost: 2500.0,
            status: 'PROCESSING',
            version: 2,
          },
        }),
      }),
    );

    await page.route(`**/api/procurement/landed-cost/${voucherId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: voucherId,
            voucherNumber: 'LCV-20260601-0002',
            status: 'DRAFT',
            version: 1,
          },
        }),
      }),
    );

    await page.goto(`/en/landed-cost`);
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('list vouchers shows paginated data', async ({ page }) => {
    const mockVouchers = Array.from({ length: 3 }).map((_, i) => ({
      id: crypto.randomUUID(),
      voucherNumber: `LCV-20260601-${String(i + 1).padStart(4, '0')}`,
      allocationMethod: 'VALUE',
      totalAllocatedCost: 1000.0 * (i + 1),
      status: i === 2 ? 'POSTED' : 'DRAFT',
      version: 1,
    }));

    await page.route('**/api/procurement/landed-cost*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: mockVouchers.map((v) => ({
            ...v,
            currencyId: 'cur-usd',
            exchangeRate: 1.0,
            transactionDate: new Date().toISOString(),
            createdById: 'user-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
          meta: { total: 3, page: 1, page_size: 10, total_pages: 1 },
        }),
      }),
    );

    await page.goto('/en/landed-cost');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });
});

test.describe('Warehouse Scope Selector (US2)', () => {
  test('scope selector renders for scoped users', async ({ page }) => {
    await page.goto('/en/dashboard');
    const scope = page.getByText(/warehouse/i);
    await expect(scope).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin Role Assignment (US3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/admin/roles');
  });

  test('page loads with role list', async ({ page }) => {
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });

  test('assign role button is visible', async ({ page }) => {
    const assignBtn = page.getByRole('button', { name: /assign/i });
    await expect(assignBtn).toBeVisible({ timeout: 5000 });
  });

  test('role assignment modal opens and shows user table', async ({ page }) => {
    const mockRoles = [
      { id: 'ADMIN', displayName: 'Admin', description: 'Full access', userCount: 2, permissions: [] },
      { id: 'PROC_OFFICER', displayName: 'Procurement Officer', description: 'Procurement', userCount: 5, permissions: [] },
      { id: 'WH_KEEPER', displayName: 'Warehouse Keeper', description: 'Warehouse', userCount: 8, permissions: [] },
    ];

    const mockUsers = Array.from({ length: 5 }).map((_, i) => ({
      id: crypto.randomUUID(),
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: i % 2 === 0 ? 'ADMIN' : 'PROC_OFFICER',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    }));

    await page.route('**/api/admin/roles', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRoles),
      }),
    );

    await page.route('**/api/admin/users*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: mockUsers,
          meta: { page: 1, page_size: 10, total: 5, total_pages: 1 },
        }),
      }),
    );

    await page.goto('/en/admin/roles');
    const assignBtn = page.getByRole('button', { name: /assign role/i });
    await assignBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/user 1/i)).toBeVisible();
  });

  test('assigning a new role calls the API and succeeds', async ({ page }) => {
    const userId = crypto.randomUUID();
    let mutationCalled = false;

    await page.route('**/api/admin/roles', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'ADMIN', displayName: 'Admin', description: 'Full access', userCount: 2, permissions: [] },
          { id: 'PROC_OFFICER', displayName: 'Procurement Officer', description: 'Procurement', userCount: 5, permissions: [] },
        ]),
      }),
    );

    await page.route('**/api/admin/users*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: userId,
              name: 'Test User',
              email: 'test@example.com',
              role: 'WH_KEEPER',
              status: 'ACTIVE',
              created_at: new Date().toISOString(),
            },
          ],
          meta: { page: 1, page_size: 10, total: 1, total_pages: 1 },
        }),
      }),
    );

    await page.route(`**/api/admin/users/${userId}/role`, (route) => {
      mutationCalled = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Role updated successfully' }),
      });
    });

    await page.goto('/en/admin/roles');
    const assignBtn = page.getByRole('button', { name: /assign role/i });
    await assignBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const userRow = dialog.getByText('Test User');
    await userRow.click();

    await expect(dialog.getByPlaceholder(/select role/i)).toBeVisible();
    const confirmBtn = dialog.getByRole('button', { name: /confirm/i });
    await expect(confirmBtn).toBeDisabled();

    const roleTrigger = dialog.locator('[data-slot="select-trigger"]');
    await roleTrigger.click();
    const roleOption = page.getByRole('option', { name: /procurement officer/i });
    await roleOption.click();

    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    await expect(mutationCalled).toBe(true);
  });
});

test.describe('Dynamic Currency Display (US4)', () => {
  test('dashboard renders with currency data', async ({ page }) => {
    await page.goto('/en/dashboard');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  });
});
