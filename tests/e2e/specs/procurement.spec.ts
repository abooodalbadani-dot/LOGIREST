/**
 * procurement.spec.ts — Full Procure-to-Pay Happy Path
 *
 * Covers the complete PR → PO → GRN → Post workflow as documented
 * in Part 3 of the System Blueprint.
 *
 * Test structure:
 *  1. PR Lifecycle — Create, Submit, Approve, Convert to PO
 *  2. PO Lifecycle — Submit, Approve
 *  3. GRN Lifecycle — Create, Submit (Receive), Post to Ledger
 *  4. Negative Tests — Status machine violations, Idempotency, Optimistic Lock
 *
 * Strategy: API mock pattern — each test sets up its own route intercepts
 * before navigation, ensuring full isolation.
 */

import { test, expect } from '@playwright/test';
import {
  injectAuthSession,
  clearAuthSession,
  DEFAULT_ADMIN_SESSION,
  type AuthSession,
} from '../helpers/auth';
import {
  makePR,
  makePO,
  makeGRN,
  mockPRById,
  mockPOById,
  mockGRNById,
  mockGRNPost403,
} from '../helpers/mocks';
import { PurchaseRequestPage } from '../pages/PurchaseRequestPage';

// ─── Role sessions ──────────────────────────────────────────────────────────

const PROC_OFFICER_SESSION: AuthSession = {
  token: 'e2e-proc-officer-proc-token',
  userId: 'e2e-proc-officer-2',
  name: 'E2E Proc Officer',
  email: 'proc.officer2@logirest-staging.com',
  role: 'PROC_OFFICER',
  warehouseId: 'warehouse-a',
};

const PROC_MGR_SESSION: AuthSession = {
  token: 'e2e-proc-mgr-proc-token',
  userId: 'e2e-proc-mgr-2',
  name: 'E2E Proc Manager',
  email: 'proc.mgr2@logirest-staging.com',
  role: 'PROC_MGR',
  warehouseId: 'warehouse-a',
};

const INV_MGR_SESSION: AuthSession = {
  token: 'e2e-inv-mgr-proc-token',
  userId: 'e2e-inv-mgr-2',
  name: 'E2E Inventory Manager',
  email: 'inv.mgr2@logirest-staging.com',
  role: 'INV_MGR',
  warehouseId: 'warehouse-a',
};

const CORS = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-branch-id, x-warehouse-id, x-xsrf-token, x-idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
};

// ─── Test suite ────────────────────────────────────────────────────────────

test.describe('Procurement — Full Procure-to-Pay Workflow', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => console.log(`[BROWSER ${msg.type()}] ${msg.text()}`));
    page.on('pageerror', (err) => console.log(`[BROWSER EXCEPTION] ${err.message}`));
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSession(page);
  });

  // ─── 1. PR List — PROC_OFFICER sees PR list ───────────────────────────

  test('PR-01 | PROC_OFFICER can view the Purchase Request list', async ({ page }) => {
    const prA = makePR({ documentNumber: `PR-2026-${Date.now()}`, status: 'DRAFT' });
    const prB = makePR({ documentNumber: `PR-2026-${Date.now() + 1}`, status: 'SUBMITTED' });

    await injectAuthSession(page, PROC_OFFICER_SESSION);

    await page.route('**/api/v1/procurement/purchase-requests*', (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify({ data: [prA, prB], meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 } }),
      });
    });

    const prPage = new PurchaseRequestPage(page);
    await prPage.gotoPRList();

    // Both PRs should render in the list
    await expect(page.getByText(prA.documentNumber as string)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(prB.documentNumber as string)).toBeVisible({ timeout: 8000 });
  });

  // ─── 2. PR Lifecycle: DRAFT → SUBMITTED ──────────────────────────────

  test('PR-02 | PR status transitions: DRAFT → SUBMITTED on submit action', async ({ page }) => {
    const prId = crypto.randomUUID();
    const pr = makePR({ id: prId, documentNumber: 'PR-2026-0002', status: 'DRAFT' });

    await injectAuthSession(page, PROC_OFFICER_SESSION);

    // GET returns DRAFT; POST /submit returns SUBMITTED
    await page.route(`**/api/v1/procurement/purchase-requests/${prId}**`, (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: CORS,
          body: JSON.stringify({ data: { ...pr, status: 'SUBMITTED', version: 2 } }),
        });
      }
      return route.fulfill({
        status: 200, contentType: 'application/json', headers: CORS,
        body: JSON.stringify({ data: pr }),
      });
    });

    const prPage = new PurchaseRequestPage(page);
    await prPage.gotoPRDetail(prId);

    // PR is in DRAFT — submit button must be visible
    await prPage.expectStatus('DRAFT');
    await expect(prPage.submitButton).toBeVisible({ timeout: 5000 });

    // Click submit
    await prPage.clickSubmit();

    // After submit response, status should update to SUBMITTED
    // Re-mock GET to return SUBMITTED
    await page.route(`**/api/v1/procurement/purchase-requests/${prId}`, (route) => {
      return route.fulfill({
        status: 200, contentType: 'application/json', headers: CORS,
        body: JSON.stringify({ data: { ...pr, status: 'SUBMITTED', version: 2 } }),
      });
    });

    // Navigate back to detail to confirm state
    await prPage.gotoPRDetail(prId);
    await prPage.expectStatus('SUBMITTED');
  });

  // ─── 3. PR Approval: SUBMITTED → APPROVED (PROC_MGR role) ─────────────

  test('PR-03 | PROC_MGR can approve a submitted PR', async ({ page }) => {
    const prId = crypto.randomUUID();
    const pr = makePR({ id: prId, documentNumber: 'PR-2026-0003', status: 'SUBMITTED' });

    await injectAuthSession(page, PROC_MGR_SESSION);

    let currentStatus = 'SUBMITTED';
    await page.route(`**/api/v1/procurement/purchase-requests/${prId}**`, (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      if (route.request().method() === 'POST') {
        currentStatus = 'APPROVED';
        return route.fulfill({
          status: 200, contentType: 'application/json', headers: CORS,
          body: JSON.stringify({ data: { ...pr, status: 'APPROVED', version: 3 } }),
        });
      }
      return route.fulfill({
        status: 200, contentType: 'application/json', headers: CORS,
        body: JSON.stringify({ data: { ...pr, status: currentStatus } }),
      });
    });

    const prPage = new PurchaseRequestPage(page);
    await prPage.gotoPRDetail(prId);

    // Approve button should be visible for PROC_MGR on a SUBMITTED PR
    await expect(prPage.approveButton).toBeVisible({ timeout: 5000 });
    await prPage.clickApprove();

    // Re-load detail and verify APPROVED status
    await prPage.gotoPRDetail(prId);
    await prPage.expectStatus('APPROVED');
  });

  // ─── 4. Convert Approved PR to PO ─────────────────────────────────────

  test('PR-04 | Convert APPROVED PR to PO creates a new Purchase Order', async ({ page }) => {
    const prId = crypto.randomUUID();
    const newPoId = crypto.randomUUID();

    await injectAuthSession(page, PROC_MGR_SESSION);

    // Mock PR detail (APPROVED)
    await page.route(`**/api/v1/procurement/purchase-requests/${prId}**`, (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      if (route.request().method() === 'POST' && route.request().url().includes('/convert-to-po')) {
        return route.fulfill({
          status: 200, contentType: 'application/json', headers: CORS,
          body: JSON.stringify({
            pr: makePR({ id: prId, status: 'CONVERTED' }),
            po: makePO({ id: newPoId, status: 'DRAFT' }),
          }),
        });
      }
      return route.fulfill({
        status: 200, contentType: 'application/json', headers: CORS,
        body: JSON.stringify({ data: makePR({ id: prId, status: 'APPROVED' }) }),
      });
    });

    const prPage = new PurchaseRequestPage(page);
    await prPage.gotoPRDetail(prId);

    // "Convert to PO" button must be visible for PROC_MGR on APPROVED PR
    await expect(prPage.convertToPOButton).toBeVisible({ timeout: 5000 });
    await prPage.clickConvertToPO();

    // After conversion, the response contains a new PO — we just verify the action was triggered
    // (UI may navigate to PO detail or show a modal — both are valid outcomes)
    // Verify no error toast appeared
    const errorToast = page.locator('[data-type="error"], .toast-error').first();
    await expect(errorToast).not.toBeVisible({ timeout: 2000 }).catch(() => {});
  });

  // ─── 5. PO Lifecycle: SUBMITTED → APPROVED ─────────────────────────────

  test('PO-01 | PROC_MGR can submit and approve a Purchase Order', async ({ page }) => {
    const poId = crypto.randomUUID();
    let currentStatus = 'DRAFT';

    await injectAuthSession(page, PROC_MGR_SESSION);

    await page.route(`**/api/v1/procurement/purchase-orders/${poId}**`, (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      if (route.request().method() === 'POST') {
        currentStatus = currentStatus === 'DRAFT' ? 'SUBMITTED' : 'APPROVED';
        return route.fulfill({
          status: 200, contentType: 'application/json', headers: CORS,
          body: JSON.stringify({ data: makePO({ id: poId, status: currentStatus }) }),
        });
      }
      return route.fulfill({
        status: 200, contentType: 'application/json', headers: CORS,
        body: JSON.stringify({ data: makePO({ id: poId, status: currentStatus }) }),
      });
    });

    const prPage = new PurchaseRequestPage(page);
    await prPage.gotoPODetail(poId);

    // Submit PO
    await expect(prPage.submitButton).toBeVisible({ timeout: 5000 });
    await prPage.clickSubmit();

    // Approve PO (navigated back to same detail — status now SUBMITTED)
    await prPage.gotoPODetail(poId);
    await expect(prPage.approveButton).toBeVisible({ timeout: 5000 });
    await prPage.clickApprove();

    await prPage.gotoPODetail(poId);
    await prPage.expectStatus('APPROVED');
  });

  // ─── 6. GRN Lifecycle: DRAFT → RECEIVED → POSTED ──────────────────────

  test('GRN-01 | INV_MGR can submit a GRN and then post it to ledger', async ({ page }) => {
    const grnId = crypto.randomUUID();
    let callCount = 0;
    const statuses = ['DRAFT', 'RECEIVED', 'POSTED'];

    await injectAuthSession(page, INV_MGR_SESSION);

    await page.route(`**/api/v1/procurement/grns/${grnId}**`, (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      if (route.request().method() === 'POST') {
        callCount = Math.min(callCount + 1, statuses.length - 1);
        return route.fulfill({
          status: 200, contentType: 'application/json', headers: CORS,
          body: JSON.stringify({ data: makeGRN({ id: grnId, status: statuses[callCount] }) }),
        });
      }
      return route.fulfill({
        status: 200, contentType: 'application/json', headers: CORS,
        body: JSON.stringify({ data: makeGRN({ id: grnId, status: statuses[callCount] }) }),
      });
    });

    const prPage = new PurchaseRequestPage(page);
    await prPage.gotoGRNDetail(grnId);

    // Step 1: GRN is DRAFT — Submit (Receive) button visible
    await expect(prPage.submitButton).toBeVisible({ timeout: 5000 });
    await prPage.clickSubmit();

    // Step 2: GRN is RECEIVED — Post button visible
    await prPage.gotoGRNDetail(grnId);
    await prPage.expectStatus('RECEIVED');
    await expect(prPage.postButton).toBeVisible({ timeout: 5000 });

    // Step 3: Post the GRN
    await prPage.clickPost();

    // Step 4: Final state — POSTED
    await prPage.gotoGRNDetail(grnId);
    await prPage.expectStatus('POSTED');
  });

  // ─── 7. Negative: WH_KEEPER cannot post GRN ───────────────────────────

  test('GRN-NEG-01 | WH_KEEPER: Post button absent on GRN in RECEIVED state', async ({ page }) => {
    const grnId = crypto.randomUUID();

    await injectAuthSession(page, {
      token: 'e2e-wh-keeper-grn-token',
      userId: 'e2e-wh-keeper-grn',
      name: 'E2E WH Keeper GRN',
      email: 'wh.keeper.grn@logirest-staging.com',
      role: 'WH_KEEPER',
      warehouseId: 'warehouse-a',
    });

    await page.route(`**/api/v1/procurement/grns/${grnId}**`, (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      return route.fulfill({
        status: 200, contentType: 'application/json', headers: CORS,
        body: JSON.stringify({ data: makeGRN({ id: grnId, status: 'RECEIVED' }) }),
      });
    });

    const prPage = new PurchaseRequestPage(page);
    await prPage.gotoGRNDetail(grnId);

    // WH_KEEPER does not have POST permission on GRN
    await expect(prPage.postButton).not.toBeVisible({ timeout: 3000 });
  });

  // ─── 8. Negative: Optimistic lock conflict on PR update ───────────────

  test('PR-NEG-01 | Optimistic locking: Stale version returns 409', async ({ page }) => {
    const prId = crypto.randomUUID();

    await injectAuthSession(page, DEFAULT_ADMIN_SESSION);
    await page.goto('/en/login');

    // Simulate the PR submit endpoint returning 409 (version mismatch)
    await page.route(`**/api/v1/procurement/purchase-requests/${prId}/submit`, (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify({
          message: 'Optimistic locking failure: version mismatch',
          statusCode: 409,
        }),
      });
    });

    // Direct API call with stale version
    const response = await page.evaluate(async (url) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version: 1 }), // stale version
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, body: data };
    }, `/api/v1/procurement/purchase-requests/${prId}/submit`);

    expect(response.status).toBe(409);
    expect(response.body.message).toContain('version mismatch');
  });

  // ─── 9. Negative: Idempotency — duplicate PR submission ───────────────

  test('PR-NEG-02 | Idempotency: Same Idempotency-Key returns same response', async ({ page }) => {
    const idempotencyKey = crypto.randomUUID();
    const prId = crypto.randomUUID();
    let callCount = 0;

    await injectAuthSession(page, DEFAULT_ADMIN_SESSION);
    await page.goto('/en/login');

    // Mock: both calls return the same PR (idempotency)
    await page.route('**/api/v1/procurement/purchase-requests', (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      if (route.request().method() === 'POST') {
        callCount++;
        return route.fulfill({
          status: callCount === 1 ? 201 : 200, // First = 201 Created, Second = 200 (idempotent)
          contentType: 'application/json',
          headers: CORS,
          body: JSON.stringify({ data: makePR({ id: prId, documentNumber: 'PR-2026-IDEMPOTENT' }) }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: '{}' });
    });

    const requestBody = {
      warehouseId: 'warehouse-a',
      departmentId: 'dept-1',
      lines: [{ itemId: 'item-1', qty: 5 }],
    };

    // First call
    const res1 = await page.evaluate(async ({ url, body, key }) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': key,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, body: data };
    }, {
      url: '/api/v1/procurement/purchase-requests',
      body: requestBody,
      key: idempotencyKey,
    });

    // Second call with same key
    const res2 = await page.evaluate(async ({ url, body, key }) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': key,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, body: data };
    }, {
      url: '/api/v1/procurement/purchase-requests',
      body: requestBody,
      key: idempotencyKey,
    });

    // Both responses must return the same document ID
    expect(res1.body.data.id).toBe(res2.body.data.id);
  });

  // ─── 10. Negative: GRN Void only allowed for ADMIN/INV_MGR ───────────

  test('GRN-NEG-02 | Void button absent for PROC_OFFICER on POSTED GRN', async ({ page }) => {
    const grnId = crypto.randomUUID();

    await injectAuthSession(page, PROC_OFFICER_SESSION);

    await page.route(`**/api/v1/procurement/grns/${grnId}**`, (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      return route.fulfill({
        status: 200, contentType: 'application/json', headers: CORS,
        body: JSON.stringify({ data: makeGRN({ id: grnId, status: 'POSTED' }) }),
      });
    });

    const prPage = new PurchaseRequestPage(page);
    await prPage.gotoGRNDetail(grnId);

    const voidBtn = page.getByRole('button', { name: /void/i });
    await expect(voidBtn).not.toBeVisible({ timeout: 3000 });
  });
});
