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
    type: 'PR',
    status: 'DRAFT',
    warehouseId: 'warehouse-a',
    branchId: 'BR-001',
    notes: null,
    createdBy: 'E2E Admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    postedAt: null,
    postedBy: null,
    version: 1,
    requestedByDept: 'dept-1',
    requiredByDate: new Date().toISOString(),
    lines: [
      {
        id: crypto.randomUUID(),
        itemId: 'item-1',
        item: {
          id: 'item-1',
          code: 'SKU-001',
          name: 'Test Item',
          nameAr: 'Test Item',
          nameEn: 'Test Item',
          primaryUom: { id: 'uom-1', code: 'PCS' },
        },
        qty: 10,
        reqQty: 10,
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
    type: 'PO',
    status: 'DRAFT',
    prId: null,
    supplierId: 'supplier-1',
    currencyId: 'currency-sar',
    warehouseId: 'warehouse-a',
    branchId: 'BR-001',
    notes: null,
    createdBy: 'E2E Admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    postedAt: null,
    postedBy: null,
    expectedDeliveryDate: new Date().toISOString(),
    version: 1,
    lines: [],
    ...overrides,
  };
}

export function makeGRN(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    documentNumber: `GRN-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    type: 'GRN',
    status: 'DRAFT',
    poId: overrides.poId ?? 'po-1',
    poNumber: overrides.poNumber ?? 'PO-2026-0001',
    supplierId: 'supplier-1',
    currencyId: 'currency-sar',
    fxRate: 1.0,
    fxRateCapturedAt: new Date().toISOString(),
    warehouseId: 'warehouse-a',
    branchId: 'BR-001',
    notes: null,
    createdBy: 'E2E Admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    postedAt: null,
    postedBy: null,
    version: 1,
    lines: [],
    ...overrides,
  };
}

export function makeTransfer(overrides: Record<string, unknown> = {}) {
  const status = overrides.status || 'DRAFT';
  return {
    id: crypto.randomUUID(),
    documentNumber: `TRF-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    type: 'TRANSFER',
    status,
    transferStatus: overrides.transferStatus || status,
    fromWarehouseId: 'warehouse-a',
    fromWarehouseName: 'Warehouse A',
    toWarehouseId: 'warehouse-b',
    toWarehouseName: 'Warehouse B',
    warehouseId: 'warehouse-a',
    branchId: 'BR-001',
    notes: null,
    shippedAt: null,
    receivedAt: null,
    postedAt: null,
    postedBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    lines: [],
    ...overrides,
  };
}

export function makeStocktake(overrides: Record<string, unknown> = {}) {
  const id = (overrides.id as string | undefined) || crypto.randomUUID();
  const itemId = (overrides.itemId as string | undefined) || 'item-1';
  const status = (overrides.status as string | undefined) || 'DRAFT';

  // If status is DRAFT or STARTED or COUNTING, physical count hasn't been submitted yet, so countedQty is null
  const defaultCountedQty = (status === 'DRAFT' || status === 'STARTED' || status === 'COUNTING') ? null : 100;
  const defaultVariance = (status === 'DRAFT' || status === 'STARTED' || status === 'COUNTING') ? null : 0;

  const defaultItems = [
    {
      id: crypto.randomUUID(),
      itemId,
      itemName: 'Test Item',
      uom: 'PCS',
      snapshotQty: 100,
      countedQty: defaultCountedQty,
      variance: defaultVariance,
      varianceReason: null as string | null,
      unitCost: 10.0,
      barcode: undefined as string | undefined,
      sku: undefined as string | undefined,
      lotNumber: undefined as string | undefined,
      expiryDate: undefined as string | undefined,
    },
  ];

  const rawItems = Array.isArray(overrides.items) ? overrides.items : defaultItems;

  const mappedItems = rawItems.map((itemNode) => {
    const item = itemNode as Record<string, unknown>;
    const itemSnapshotQty = typeof item.snapshotQty === 'number' ? item.snapshotQty : 100;
    const itemCountedQty = item.countedQty !== undefined ? (item.countedQty as number | null) : defaultCountedQty;
    const itemVariance = item.variance !== undefined ? (item.variance as number | null) : defaultVariance;
    return {
      id: (item.id as string | undefined) || crypto.randomUUID(),
      itemId: (item.itemId as string | undefined) || itemId,
      itemName: (item.itemName as string | undefined) || 'Test Item',
      barcode: (item.barcode as string | undefined) || (item.sku as string | undefined) || 'SKU-001',
      uom: (item.uom as string | undefined) || 'PCS',
      snapshotQty: itemSnapshotQty,
      countedQty: itemCountedQty,
      variance: itemVariance,
      varianceReason: (item.varianceReason as string | null | undefined) ?? null,
      lotNumber: (item.lotNumber as string | undefined),
      expiryDate: (item.expiryDate as string | undefined),
      unitCost: typeof item.unitCost === 'number' ? item.unitCost : 10.0,
    };
  });

  const defaultCounts = mappedItems.map(item => ({
    id: item.id,
    sessionId: id,
    itemId: item.itemId,
    item: {
      id: item.itemId,
      code: item.barcode,
      nameAr: item.itemName,
      nameEn: item.itemName,
    },
    lotId: null as string | null,
    snapshotQty: item.snapshotQty,
    countedQty: item.countedQty,
    variance: item.variance,
    varianceReason: item.varianceReason,
  }));

  return {
    id,
    sessionNumber: `ST-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    sessionName: (overrides.sessionName as string | undefined) || 'Test Session',
    status,
    warehouseId: 'warehouse-a',
    warehouseName: 'Warehouse A',
    snapshotAt: new Date().toISOString(),
    startedBy: 'E2E Admin',
    postedAt: null as string | null,
    postedBy: null as string | null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    items: mappedItems,
    counts: defaultCounts,
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
    if (route.request().method() === 'POST' || route.request().method() === 'PUT') {
      callIndex++;
      return corsPreflightOrJson(route, { data: makePR({ id: prId, status: getStatus() }) });
    }
    return corsPreflightOrJson(route, { data: body });
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
    if (route.request().method() === 'POST' || route.request().method() === 'PUT') {
      callIndex++;
    }
    return corsPreflightOrJson(route, { data: makePO({ id: poId, status: getStatus() }) });
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
    if (route.request().method() === 'POST' || route.request().method() === 'PUT') {
      callIndex++;
    }
    return corsPreflightOrJson(route, { data: makeGRN({ id: grnId, status: getStatus() }) });
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
  statusSequence: string[] = ['DRAFT', 'STARTED', 'REVIEW', 'APPROVED', 'POSTED'],
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
  items: Array<{
    sku: string;
    name: string;
    qtyPhysical: number;
    category?: string;
    qtyReserved?: number;
    qtyAvailable?: number;
  }> = [],
) {
  await page.route('**/api/v1/reports/available-inventory**', (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    const mappedItems = items.map((item) => ({
      sku: item.sku,
      name: item.name,
      category: item.category ?? 'General',
      qtyPhysical: item.qtyPhysical,
      qtyReserved: item.qtyReserved ?? 0,
      qtyAvailable: item.qtyAvailable ?? item.qtyPhysical,
    }));
    return corsPreflightOrJson(route, {
      data: mappedItems,
      total: mappedItems.length,
      page: 1,
      limit: 50,
    });
  });
}
