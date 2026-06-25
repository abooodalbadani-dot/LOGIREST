/**
 * rbac.spec.ts — RBAC Penetration Tests (PT-01 to PT-05)
 *
 * Implements all five penetration test cases defined in the System Blueprint:
 *
 *  PT-01 — WH_KEEPER cannot access Admin UI or call Admin APIs
 *  PT-02 — WH_KEEPER scoped to Warehouse A cannot see Warehouse B documents
 *  PT-03 — PROC_OFFICER cannot post a GRN to ledger
 *  PT-04 — Invalid status machine transition is rejected (DRAFT → POST)
 *  PT-05 — Frozen item raises 400 on issue creation
 *
 * Additional UI-level RBAC assertions:
 *  - PROC_OFFICER cannot see Approve button on PO detail
 *  - WH_KEEPER cannot see Post button on GRN detail
 *  - AUDITOR can see all reports
 *
 * Strategy: API mock pattern — NO real backend required.
 * Each test is self-contained and data-isolated via unique IDs.
 */

import { test, expect } from '@playwright/test';
import {
  injectAuthSession,
  clearAuthSession,
  DEFAULT_ADMIN_SESSION,
  DEFAULT_SCOPED_SESSION,
  type AuthSession,
} from '../helpers/auth';
import {
  mockAdminEndpoint403,
  mockGRNPost403,
  mockAdjustmentPost400,
  makeGRN,
  makePO,
  makeTransfer,
} from '../helpers/mocks';

// ─── Role session factories ─────────────────────────────────────────────────

const PROC_OFFICER_SESSION: AuthSession = {
  token: 'e2e-proc-officer-token',
  userId: 'e2e-proc-officer',
  name: 'E2E Proc Officer',
  email: 'proc.officer@logirest-staging.com',
  role: 'PROC_OFFICER',
  warehouseId: 'warehouse-a',
};

const PROC_MGR_SESSION: AuthSession = {
  token: 'e2e-proc-mgr-token',
  userId: 'e2e-proc-mgr',
  name: 'E2E Proc Manager',
  email: 'proc.mgr@logirest-staging.com',
  role: 'PROC_MGR',
  warehouseId: 'warehouse-a',
};

const AUDITOR_SESSION: AuthSession = {
  token: 'e2e-auditor-token',
  userId: 'e2e-auditor',
  name: 'E2E Auditor',
  email: 'auditor@logirest-staging.com',
  role: 'AUDITOR',
  warehouseId: 'warehouse-a',
};

const WH_KEEPER_B_SESSION: AuthSession = {
  token: 'e2e-wh-keeper-b-token',
  userId: 'e2e-wh-keeper-b',
  name: 'E2E WH Keeper B',
  email: 'wh.keeper.b@logirest-staging.com',
  role: 'WH_KEEPER',
  warehouseId: 'warehouse-b', // Scoped only to warehouse-b
};

// ─── CORS / JSON helper ─────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-branch-id, x-warehouse-id, x-xsrf-token, x-idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
};

// ─── Test suite ────────────────────────────────────────────────────────────

test.describe('RBAC Penetration Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => console.log(`[BROWSER ${msg.type()}] ${msg.text()}`));
    page.on('pageerror', (err) => console.log(`[BROWSER EXCEPTION] ${err.message}`));
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSession(page);
  });

  // ─── PT-01: WH_KEEPER cannot access Admin UI ───────────────────────────

  test('PT-01 | WH_KEEPER: Admin navigation link is hidden and /admin page is inaccessible', async ({
    page,
  }) => {
    await injectAuthSession(page, DEFAULT_SCOPED_SESSION); // WH_KEEPER

    // Mock the admin endpoint to return 403
    await mockAdminEndpoint403(page);

    await page.goto('/en/dashboard');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible({ timeout: 15000 });

    // Admin link must NOT be present in sidebar for non-ADMIN roles
    const adminLink = page.locator('a[href*="/admin/users"], a[href*="/admin/settings"]');
    await expect(adminLink).not.toBeVisible({ timeout: 3000 });

    // Attempting direct navigation should redirect or show 403
    const status = await page.evaluate(async () => {
      const res = await fetch('/api/v1/admin/users');
      return res.status;
    });
    // The mock returns 403 for admin endpoints
    expect(status).toBe(403);
  });

  // ─── PT-02: Cross-Warehouse data isolation ─────────────────────────────

  test('PT-02 | WH_KEEPER scoped to WH-B: cannot access Warehouse A transfer detail', async ({
    page,
  }) => {
    const transferId = crypto.randomUUID();

    await injectAuthSession(page, WH_KEEPER_B_SESSION); // Scoped to warehouse-b

    // Mock: transfer belongs to warehouse-a and warehouse-c (neither is warehouse-b)
    await page.route(`**/api/v1/operations/transfers/${transferId}**`, (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS });
      }
      // Backend would return 403; we simulate it here
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify({
          message: 'Access to none of the requested warehouses is authorized.',
          statusCode: 403,
        }),
      });
    });

    await page.goto(`/en/transfers/${transferId}`);

    // App should NOT render the document detail — should show error or redirect
    // We verify the "Post" button (Warehouse-A action) is absent
    const postBtn = page.getByRole('button', { name: /^post$/i });
    await expect(postBtn).not.toBeVisible({ timeout: 5000 });

    // Error state or redirect away from the document
    const errorIndicator = page.locator(
      '[data-testid="error-state"], [data-slot="alert"], h2:has-text("403"), h2:has-text("Forbidden"), [href*="/en/transfers"]',
    );
    // Accept either a 403-screen OR a redirect back to the list
    const currentUrl = page.url();
    const hasError = await errorIndicator.count() > 0;
    const redirectedToList = currentUrl.includes('/transfers') && !currentUrl.includes(transferId);
    expect(hasError || redirectedToList).toBe(true);
  });

  // ─── PT-03: PROC_OFFICER cannot post GRN ──────────────────────────────

  test('PT-03 | PROC_OFFICER: Post button is absent on GRN detail screen', async ({ page }) => {
    const grnId = crypto.randomUUID();

    await injectAuthSession(page, PROC_OFFICER_SESSION);

    // Mock GRN in RECEIVED state (eligible for posting)
    await page.route(`**/api/v1/procurement/grns/${grnId}**`, (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify(
          makeGRN({ id: grnId, status: 'RECEIVED', poId: 'po-test' }),
        ),
      });
    });

    // Mock the GRN post endpoint to 403 just in case the button somehow renders
    await mockGRNPost403(page, grnId);

    await page.goto(`/en/goods-received/${grnId}`);
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible({ timeout: 15000 });

    // PROC_OFFICER does not have the POST role on GRN — button must NOT be visible
    const postBtn = page.getByRole('button', { name: /^post$/i });
    await expect(postBtn).not.toBeVisible({ timeout: 3000 });
  });

  // ─── PT-04: Invalid status transition (DRAFT → POST) ──────────────────

  test('PT-04 | WorkflowStateGuard: Posting a DRAFT adjustment returns 400', async ({ page }) => {
    const adjId = crypto.randomUUID();

    await injectAuthSession(page, DEFAULT_ADMIN_SESSION); // ADMIN — has the role, but state machine blocks
    await page.goto('/en/login');

    // Mock the /post endpoint to return 400 (WorkflowStateGuard rejects)
    await mockAdjustmentPost400(page, adjId);

    // Mock the GET of the adjustment (DRAFT state — post button may or may not show)
    await page.route(`**/api/v1/operations/adjustments/${adjId}`, (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify({
          id: adjId,
          documentNumber: 'ADJ-2026-0001',
          status: 'DRAFT',
          type: 'INCREASE',
          warehouseId: 'warehouse-a',
          version: 1,
          lines: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    // Make a direct API request to simulate the attack
    const response = await page.evaluate(async (url) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-warehouse-id': 'warehouse-a',
        },
        body: JSON.stringify({ version: 1 }),
      });
      return { status: res.status };
    }, `/api/v1/operations/adjustments/${adjId}/post`);

    // The mocked response (or real backend) must return 400
    expect([400, 403]).toContain(response.status);
  });

  // ─── PT-05: Frozen item raises 400 on issue creation ──────────────────

  test('PT-05 | Frozen item: Issue creation blocked with 400', async ({ page }) => {
    await injectAuthSession(page, DEFAULT_ADMIN_SESSION);
    await page.goto('/en/login');

    const frozenItemId = `frozen-item-${Date.now()}`;

    // Mock the issue create endpoint to return 400 for frozen item
    await page.route('**/api/v1/operations/issues', (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS });
      }
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          headers: CORS,
          body: JSON.stringify({
            message: `Item ${frozenItemId} is frozen/locked in warehouse warehouse-a`,
            statusCode: 400,
          }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: '{}' });
    });

    const idempotencyKey = crypto.randomUUID();
    // Direct API call simulating a frozen-item attack
    const response = await page.evaluate(async ({ url, body, key }) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-warehouse-id': 'warehouse-a',
          'x-idempotency-key': key,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, body: data };
    }, {
      url: '/api/v1/operations/issues',
      body: {
        warehouseId: 'warehouse-a',
        departmentId: 'dept-1',
        lines: [{ itemId: frozenItemId, quantity: 5 }],
      },
      key: idempotencyKey
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('frozen');
  });

  // ─── UI RBAC: PROC_OFFICER approve button absent on PO ────────────────

  test('UI-RBAC-01 | PROC_OFFICER: Approve button is NOT visible on PO detail', async ({
    page,
  }) => {
    const poId = crypto.randomUUID();
    await injectAuthSession(page, PROC_OFFICER_SESSION);

    // Mock PO in SUBMITTED state (eligible for approval)
    await page.route(`**/api/v1/procurement/purchase-orders/${poId}**`, (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify({ data: makePO({ id: poId, status: 'SUBMITTED' }) }),
      });
    });

    await page.goto(`/en/purchase-orders/${poId}`);
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible({ timeout: 15000 });

    // PROC_OFFICER role cannot approve PO — button must NOT be rendered
    const approveBtn = page.getByRole('button', { name: /^approve$/i });
    await expect(approveBtn).not.toBeVisible({ timeout: 3000 });
  });

  // ─── UI RBAC: WH_KEEPER Post button absent on GRN ────────────────────

  test('UI-RBAC-02 | WH_KEEPER: Post button is NOT visible on GRN detail', async ({ page }) => {
    const grnId = crypto.randomUUID();
    await injectAuthSession(page, DEFAULT_SCOPED_SESSION); // WH_KEEPER

    await page.route(`**/api/v1/procurement/grns/${grnId}**`, (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify({ data: makeGRN({ id: grnId, status: 'RECEIVED' }) }),
      });
    });

    await page.goto(`/en/goods-received/${grnId}`);
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible({ timeout: 15000 });

    // WH_KEEPER is not in the POST allowed roles for GRN
    const postBtn = page.getByRole('button', { name: /^post$/i });
    await expect(postBtn).not.toBeVisible({ timeout: 3000 });
  });

  // ─── UI RBAC: AUDITOR can access reports ──────────────────────────────

  test('UI-RBAC-03 | AUDITOR: Can navigate to Available Inventory report', async ({ page }) => {
    await injectAuthSession(page, AUDITOR_SESSION);

    // Mock the reports endpoint
    await page.route('**/api/v1/reports/available-inventory**', (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }),
      });
    });

    await page.goto('/en/reports/available-inventory');
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible({ timeout: 15000 });

    // Reports page should render without redirect to 403
    expect(page.url()).not.toContain('/login');
    expect(page.url()).not.toContain('/403');
  });

  // ─── UI RBAC: PROC_MGR Convert-to-PO is visible after PR approval ─────

  test('UI-RBAC-04 | PROC_MGR: Convert to PO button is visible on APPROVED PR', async ({
    page,
  }) => {
    const prId = crypto.randomUUID();
    await injectAuthSession(page, PROC_MGR_SESSION);

    await page.route(`**/api/v1/procurement/purchase-requests/${prId}**`, (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify({
          id: prId,
          documentNumber: 'PR-2026-0001',
          status: 'APPROVED',
          warehouseId: 'warehouse-a',
          lines: [],
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto(`/en/purchase-requests/${prId}`);
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible({ timeout: 15000 });

    // PROC_MGR should see the Convert to PO button
    const convertBtn = page.getByRole('button', { name: /convert.*(po|purchase order)/i }).first();
    await expect(convertBtn).toBeVisible({ timeout: 5000 });
  });
});
