import { Page } from '@playwright/test';

/**
 * Shared API route mock builders.
 *
 * Design: Each helper sets up `page.route()` intercepts that match the real
 * LogiRest API path pattern.  Tests call these before `page.goto()` so all
 * requests are intercepted deterministically without touching a real database.
 *
 * CORS headers are included on every response because the Next.js app runs
 * on localhost:3000 and the API on localhost:3001; the browser enforces CORS
 * even in Playwright unless the response includes the allow-origin header.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-branch-id, x-warehouse-id, x-xsrf-token, x-idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
};

function corsPreflightOrJson(route: Parameters<Parameters<Page['route']>[1]>[0], body: unknown) {
  if (route.request().method() === 'OPTIONS') {
    return route.fulfill({ status: 204, headers: CORS_HEADERS });
  }
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  });
}

// ─── Factories ────────────────────────────────────────────────────────────────

export function makePR(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    documentNumber: `PR-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    status: 'DRAFT',
    warehouseId: 'warehouse-a',
    departmentId: 'dept-1',
    createdBy: 'E2E Admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    lines: [
      {
        id: crypto.randomUUID(),
        itemId: 'item-1',
        item: { id: 'item-1', code: 'SKU-001', nameAr: 'Test Item', nameEn: 'Test Item' },
        qty: 10,
        uomId: 'uom-1',
        unitCost: null,
      },
    ],
    ...overrides,
  };
}

export function makePO(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    documentNumber: `PO-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    status: 'DRAFT',
    supplierId: 'supplier-1',
    currencyId: 'currency-sar',
    warehouseId: 'warehouse-a',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    lines: [],
    ...overrides,
  };
}

export function makeGRN(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    documentNumber: `GRN-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    status: 'DRAFT',
    poId: overrides.poId ?? 'po-1',
    warehouseId: 'warehouse-a',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    lines: [],
    ...overrides,
  };
}

export function makeTransfer(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    documentNumber: `TRF-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    status: 'DRAFT',
    fromWarehouseId: 'warehouse-a',
    fromWarehouseName: 'Warehouse A',
    toWarehouseId: 'warehouse-b',
    toWarehouseName: 'Warehouse B',
    warehouseId: 'warehouse-a',
    branchId: 'BR-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    lines: [],
    ...overrides,
  };
}

export function makeStocktake(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    sessionNumber: `ST-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    status: 'DRAFT',
    warehouseId: 'warehouse-a',
    warehouseName: 'Warehouse A',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    items: [
      {
        id: crypto.randomUUID(),
        itemId: 'item-1',
        itemName: 'Test Item',
        sku: 'SKU-001',
        systemQty: 100,
        countedQty: null,
      },
    ],
    ...overrides,
  };
}

// ─── Route Mock Helpers ───────────────────────────────────────────────────────

/** Mock GET + POST /api/v1/procurement/purchase-requests */
export async function mockPRList(page: Page, prs: ReturnType<typeof makePR>[]) {
  await page.route('**/api/v1/procurement/purchase-requests*', (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    if (route.request().method() === 'POST') {
      return corsPreflightOrJson(route, prs[0] ?? makePR());
    }
    return corsPreflightOrJson(route, {
      data: prs,
      meta: { total: prs.length, page: 1, pageSize: 20, totalPages: 1 },
    });
  });
}

/** Mock a single PR by ID (GET + workflow actions POST) */
export async function mockPRById(
  page: Page,
  prId: string,
  statusSequence: string[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'CONVERTED'],
) {
  let callIndex = 0;
  const getStatus = () => statusSequence[Math.min(callIndex, statusSequence.length - 1)];

  await page.route(`**/api/v1/procurement/purchase-requests/${prId}**`, (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    const body = makePR({ id: prId, status: getStatus() });
    if (route.request().method() === 'POST') {
      callIndex++;
      return corsPreflightOrJson(route, makePR({ id: prId, status: getStatus() }));
    }
    return corsPreflightOrJson(route, body);
  });
}

/** Mock a single PO by ID */
export async function mockPOById(
  page: Page,
  poId: string,
  statusSequence: string[] = ['DRAFT', 'SUBMITTED', 'APPROVED'],
) {
  let callIndex = 0;
  const getStatus = () => statusSequence[Math.min(callIndex, statusSequence.length - 1)];

  await page.route(`**/api/v1/procurement/purchase-orders/${poId}**`, (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    if (route.request().method() === 'POST') {
      callIndex++;
    }
    return corsPreflightOrJson(route, makePO({ id: poId, status: getStatus() }));
  });
}

/** Mock a single GRN by ID */
export async function mockGRNById(
  page: Page,
  grnId: string,
  statusSequence: string[] = ['DRAFT', 'RECEIVED', 'POSTED'],
) {
  let callIndex = 0;
  const getStatus = () => statusSequence[Math.min(callIndex, statusSequence.length - 1)];

  await page.route(`**/api/v1/procurement/grns/${grnId}**`, (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    if (route.request().method() === 'POST') {
      callIndex++;
    }
    return corsPreflightOrJson(route, makeGRN({ id: grnId, status: getStatus() }));
  });
}

/** Mock admin endpoint to return 403 (for RBAC negative tests) */
export async function mockAdminEndpoint403(page: Page) {
  await page.route('**/api/v1/admin/**', (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    return route.fulfill({
      status: 403,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Forbidden', statusCode: 403 }),
    });
  });
}

/** Mock a GRN post endpoint to return 403 (for RBAC negative tests) */
export async function mockGRNPost403(page: Page, grnId: string) {
  await page.route(`**/api/v1/procurement/grns/${grnId}/post`, (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    return route.fulfill({
      status: 403,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Forbidden', statusCode: 403 }),
    });
  });
}

/** Mock an adjustment post endpoint to return 400 (invalid status transition) */
export async function mockAdjustmentPost400(page: Page, adjId: string) {
  await page.route(`**/api/v1/operations/adjustments/${adjId}/post`, (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    return route.fulfill({
      status: 400,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Invalid status transition: Cannot POST a DRAFT document.',
        statusCode: 400,
      }),
    });
  });
}

/** Mock the transfer list and a transfer by ID */
export async function mockTransferById(
  page: Page,
  transferId: string,
  statusSequence: string[] = ['DRAFT', 'IN_TRANSIT', 'RECEIVED', 'POSTED'],
) {
  let callIndex = 0;
  const getStatus = () => statusSequence[Math.min(callIndex, statusSequence.length - 1)];

  await page.route(`**/api/v1/operations/transfers/${transferId}**`, (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    if (route.request().method() === 'POST') {
      callIndex++;
    }
    return corsPreflightOrJson(route, makeTransfer({ id: transferId, status: getStatus() }));
  });
}

/** Mock stocktake session by ID */
export async function mockStocktakeById(
  page: Page,
  sessionId: string,
  statusSequence: string[] = ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'POSTED'],
) {
  let callIndex = 0;
  const getStatus = () => statusSequence[Math.min(callIndex, statusSequence.length - 1)];

  await page.route(`**/api/v1/stocktake/sessions/${sessionId}**`, (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    if (route.request().method() === 'POST' || route.request().method() === 'PUT') {
      callIndex++;
    }
    return corsPreflightOrJson(route, makeStocktake({ id: sessionId, status: getStatus() }));
  });
}

/** Mock the available-inventory report */
export async function mockAvailableInventoryReport(
  page: Page,
  items: Array<{ sku: string; name: string; qtyPhysical: number }> = [],
) {
  await page.route('**/api/v1/reports/available-inventory**', (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    return corsPreflightOrJson(route, {
      data: items,
      meta: { total: items.length, page: 1, pageSize: 50, totalPages: 1 },
    });
  });
}
