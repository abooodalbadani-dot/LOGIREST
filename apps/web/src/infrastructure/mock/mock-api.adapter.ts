/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from './mock-database';
import { MockFactory } from './mock-factory';
import { PurchaseRequest, PurchaseOrder, GRN, StockIssue, Transfer, Adjustment, DocumentStatus, TransferStatus, PRLineItem } from '@/types/documents';
import { Branch, Warehouse, Department, UoM, Category, Item, Supplier, Currency, Lot, Barcode, FXRate } from '@/types/master-data';
import { StocktakeSession } from '@/features/operations/types/stocktake';
import { KitchenRequestDetail } from '@/features/operations/types/kitchen-request';

import { getNextStatusV2, canPerformActionV2, DocumentAction } from '@logirest/shared-types';
import { STOCKTAKE_STATUS, ADJUSTMENT_STATUS, TRANSFER_STATUS, ISSUE_STATUS } from '@logirest/shared-types';
import { OPERATIONAL_CONFIG } from '@/contracts/operational-config';

interface HydrationLine {
  id?: string;
  itemId: string;
  item?: Record<string, unknown>;
  qty?: number;
  reqQty?: number;
  lotId?: string | null;
  uomId?: string;
  approvedQty?: number | null;
}

interface HydrationBody {
  lines?: HydrationLine[];
  departmentId?: string;
  requestedByDept?: string;
  expectedDate?: string;
  requiredByDate?: string;
  warehouseId?: string;
}

/**
 * Helper to record inventory movements
 */
async function recordMovement(params: {
  documentId: string;
  documentNumber: string;
  documentType: 'GRN' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT';
  itemId: string;
  lotNumber: string | null;
  direction: 'IN' | 'OUT';
  qty: number;
}) {
  const item = await db.items.findById(params.itemId);
  if (!item) return;

  await db.movements.save({
    id: `mov-${Math.random().toString(36).substring(2, 11)}`,
    timestamp: new Date().toISOString(),
    documentReference: params.documentNumber,
    transactionType: params.documentType,
    itemId: params.itemId,
    itemName: item.nameEn,
    quantity: params.direction === 'IN' ? params.qty : -params.qty,
    balanceAfter: 0,
  });
}

/**
 * Hydrates a Purchase Request with full line item details and mappings
 */
async function hydratePR(pr: PurchaseRequest, body: HydrationBody): Promise<PurchaseRequest> {
  const lines = await Promise.all((body.lines || []).map(async (l) => {
    const item = await db.items.findById(l.itemId);
    const qty = l.qty ?? l.reqQty ?? 0;
    return {
      id: l.id || `line-${Math.random().toString(36).substring(7)}`,
      documentId: pr.id,
      itemId: l.itemId,
      item: item ? {
        id: item.id,
        code: item.code,
        name_ar: item.nameAr,
        name_en: item.nameEn,
        primary_uom: item.primaryUom
      } : l.item,
      lotId: l.lotId || null,
      lot: null,
      qty,
      uomId: l.uomId || item?.primaryUom.id || '',
      unitCost: null,
      requestedQty: qty,
      reqQty: qty, // Alias for feature schema
      approvedQty: l.approvedQty ?? null
    } as PRLineItem & { reqQty: number };
  }));

  const deptId = body.departmentId || body.requestedByDept || pr.requestedByDept;
  const date = body.expectedDate || body.requiredByDate || pr.requiredByDate;

  return {
    ...pr,
    requested_by_dept: deptId,
    department_id: deptId, // Alias for feature schema
    required_by_date: date,
    expected_date: date, // Alias for feature schema
    lines
  } as PurchaseRequest & { department_id: string, expected_date: string };
}

/**
 * Hydrates an Adjustment with nested item details
 */
async function hydrateAdjustment(doc: any): Promise<any> {
  const lines = await Promise.all((doc.lines || []).map(async (l: any) => {
    const item = await db.items.findById(l.item_id);
    return {
      id: l.id || `line-${Math.random().toString(36).substring(7)}`,
      itemId: l.item_id,
      item: item ? {
        id: item.id,
        code: item.code,
        name_ar: item.nameAr,
        name_en: item.nameEn,
        primary_uom: {
          id: item.primaryUom.id,
          code: item.primaryUom.code,
        }
      } : {
        id: l.item_id,
        code: 'CUSTOM',
        name_ar: 'Custom Item',
        name_en: 'Custom Item',
        primary_uom: { id: l.uomId || 'uom-pcs', code: 'PCS' }
      },
      direction: l.direction || 'INCREASE',
      qty_before: l.qty_before ?? 0,
      qty_adjusted: l.qty_adjusted ?? 0,
      uomId: l.uomId || item?.primaryUom.id || 'uom-pcs',
      reason_notes: l.reason_notes || undefined,
    };
  }));
  return { ...doc, lines };
}

/**
 * Hydrates an Issue with UoM and lot allocations
 */
async function hydrateIssue(doc: any): Promise<any> {
  const lines = await Promise.all((doc.lines || []).map(async (l: any) => {
    const item = await db.items.findById(l.itemId);
    const lot = l.lotId ? await db.lots.findById(l.lotId) : null;
    
    const lotAllocations = await Promise.all((l.lotAllocations || []).map(async (alloc: any) => {
      const aLot = await db.lots.findById(alloc.lotId);
      return {
        lotId: alloc.lotId,
        lotNumber: alloc.lotNumber || aLot?.lotNumber || '',
        expiryDate: alloc.expiryDate || aLot?.expiryDate || null,
        allocatedQty: alloc.allocatedQty ?? 0,
        overrideReason: alloc.overrideReason || null
      };
    }));

    return {
      id: l.id || `line-${Math.random().toString(36).substring(7)}`,
      documentId: doc.id,
      itemId: l.itemId,
      item: item ? {
        id: item.id,
        code: item.code,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        primaryUom: {
          id: item.primaryUom.id,
          code: item.primaryUom.code,
          nameAr: item.primaryUom.nameAr || item.primaryUom.code,
          nameEn: item.primaryUom.nameEn || item.primaryUom.code
        }
      } : {
        id: l.itemId,
        code: 'CUSTOM',
        nameAr: 'Custom Item',
        nameEn: 'Custom Item',
        primaryUom: { id: l.uomId || 'uom-pcs', code: 'PCS', nameAr: 'حبة', nameEn: 'Piece' }
      },
      lotId: l.lotId || null,
      lot: lot ? {
        id: lot.id,
        lotNumber: lot.lotNumber,
        expiryDate: lot.expiryDate || null,
        isExpired: lot.isExpired || false,
      } : null,
      qty: l.qty ?? 0,
      uomId: l.uomId || item?.primaryUom.id || 'uom-pcs',
      unitCost: l.unitCost ?? null,
      requestedQty: l.requestedQty ?? l.qty ?? 0,
      issuedQty: l.issuedQty ?? 0,
      lotAllocations: lotAllocations
    };
  }));
  return { ...doc, lines };
}

/**
 * Hydrates a Transfer with lot allocations and exact null fields
 */
async function hydrateTransfer(doc: any): Promise<any> {
  const lines = await Promise.all((doc.lines || []).map(async (l: any) => {
    const item = await db.items.findById(l.itemId);
    
    const lotAllocations = await Promise.all((l.lotAllocations || []).map(async (alloc: any) => {
      const aLot = await db.lots.findById(alloc.lotId);
      return {
        lotId: alloc.lotId,
        lotNumber: alloc.lotNumber || aLot?.lotNumber || '',
        expiryDate: alloc.expiryDate || aLot?.expiryDate || null,
        allocatedQty: alloc.allocatedQty ?? 0,
        overrideReason: alloc.overrideReason || null
      };
    }));

    return {
      id: l.id || `line-${Math.random().toString(36).substring(7)}`,
      documentId: doc.id,
      itemId: l.itemId,
      item: item ? {
        id: item.id,
        code: item.code,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        primaryUom: {
          id: item.primaryUom.id,
          code: item.primaryUom.code,
          nameAr: item.primaryUom.nameAr || item.primaryUom.code,
          nameEn: item.primaryUom.nameEn || item.primaryUom.code
        }
      } : {
        id: l.itemId,
        code: 'CUSTOM',
        nameAr: 'Custom Item',
        nameEn: 'Custom Item',
        primaryUom: { id: l.uomId || 'uom-pcs', code: 'PCS', nameAr: 'حبة', nameEn: 'Piece' }
      },
      lotId: l.lotId || null,
      lot: null,
      qty: l.qty ?? 0,
      unitCost: null,
      shippedQty: l.shippedQty ?? l.qty ?? 0,
      receivedQty: l.receivedQty !== undefined ? l.receivedQty : null,
      uomId: l.uomId || item?.primaryUom.id || 'uom-pcs',
      lotAllocations: lotAllocations
    };
  }));
  return { ...doc, lines };
}

/**
 * Hydrates a Kitchen Request
 */
async function hydrateKitchenRequest(doc: any): Promise<any> {
  const items = await Promise.all((doc.items || []).map(async (l: any) => {
    const item = await db.items.findById(l.item_id);
    return {
      id: l.id || `item-${Math.random().toString(36).substring(7)}`,
      itemId: l.item_id,
      itemName: item ? (item.nameEn || item.nameAr) : 'Custom Item',
      uom: item ? item.primaryUom.code : 'PCS',
      quantity: l.quantity ?? 0,
      notes: l.notes || '',
      fulfilled_quantity: l.fulfilled_quantity ?? 0
    };
  }));
  return { ...doc, items };
}

/**
 * Hydrates a Goods Received Note (GRN) with nested supplier/lots
 */
async function hydrateGRN(doc: any): Promise<any> {
  const supplier = doc.supplier_id ? await db.suppliers.findById(doc.supplier_id) : null;
  const lines = await Promise.all((doc.lines || []).map(async (l: any) => {
    const item = await db.items.findById(l.item_id);
    
    let lotVal = null;
    if (l.lot) {
      lotVal = {
        id: l.lot.id || `lot-${Math.random().toString(36).substring(7)}`,
        lotNumber: l.lot.lot_number || '',
        expiry_date: l.lot.expiry_date || null
      };
    } else if (l.lot_id) {
      const dbLot = await db.lots.findById(l.lot_id);
      if (dbLot) {
        lotVal = {
          id: dbLot.id,
          lotNumber: dbLot.lotNumber,
          expiry_date: dbLot.expiryDate || null
        };
      }
    }

    return {
      id: l.id || `line-${Math.random().toString(36).substring(7)}`,
      item: item ? {
        id: item.id,
        code: item.code,
        name_ar: item.nameAr,
        name_en: item.nameEn,
        primary_uom: {
          id: item.primaryUom.id,
          code: item.primaryUom.code
        }
      } : {
        id: l.item_id,
        code: 'CUSTOM',
        name_ar: 'Custom Item',
        name_en: 'Custom Item',
        primary_uom: { id: 'uom-pcs', code: 'PCS' }
      },
      lot: lotVal,
      qty: l.qty ?? 0,
      receivedQty: l.receivedQty ?? l.qty ?? 0,
      uomId: l.uom_id || item?.primaryUom.id || 'uom-pcs',
      unit_cost_foreign: l.unit_cost_foreign ?? null,
      unit_cost_base: l.unit_cost_base ?? null
    };
  }));

  return {
    ...doc,
    supplier: supplier ? {
      id: supplier.id,
      name: supplier.nameEn || supplier.nameAr || ''
    } : undefined,
    lines
  };
}

/**
 * Mock API Adapter
 * Acts as a bridge between the application's API calls and the Mock Repositories.
 */
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createMockToken(user: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(JSON.stringify({
    sub: user.id,
    name: user.name,
    role: user.role,
    exp: now + 86400,
    iat: now,
    user
  }));
  const signature = base64UrlEncode('mock-signature');
  return `${header}.${payload}.${signature}`;
}

function decodeMockToken(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function getTokenFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)logirest_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeSeconds = 86400): void {
  const isSecure = location.protocol === 'https:';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

function clearCookie(name: string): void {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

const MOCK_USERS = [
  {
    id: 'usr-12345',
    name: 'Barakat Amin',
    email: 'admin@kitchen.io',
    role: 'ADMIN' as const,
    locale: 'en' as const,
    scopes: [{ branch_id: 'br-main', warehouse_id: 'wh-central', department_id: 'dept-kitchen' }],
    notification_preferences: { lowStock: true, expiry: true, pendingApproval: true, poFinalized: false, security: true },
  },
  {
    id: 'usr-67890',
    name: 'Layla Hassan',
    email: 'store@kitchen.io',
    role: 'STORE_MGR' as const,
    locale: 'ar' as const,
    scopes: [{ branch_id: 'br-main', warehouse_id: 'wh-central', department_id: 'dept-kitchen' }],
    notification_preferences: { lowStock: true, expiry: true, pendingApproval: true, poFinalized: false, security: true },
  },
];

function findMockUser(email: string): Record<string, unknown> | undefined {
  return MOCK_USERS.find(u => u.email === email) as unknown as Record<string, unknown> | undefined;
}

export async function getMockResponse(method: string, path: string, body?: unknown): Promise<unknown> {
  const normalizedPath = path.split('?')[0];
  const searchParams = new URLSearchParams(path.split('?')[1] || '');

  // --- Auth Routes ---
  if (normalizedPath === '/auth/login' && method === 'POST') {
    const { email, password } = body as { email: string; password: string };
    if (!email || !password) {
      return { error: { status: 400, code: 'INVALID_CREDENTIALS', message: 'Email and password are required.' } };
    }
    const user = findMockUser(email);
    if (!user) {
      return { error: { status: 401, code: 'UNAUTHORIZED', message: 'Invalid email or password.' } };
    }
    const token = createMockToken(user);
    setCookie('logirest_token', token, 86400);
    return { user, token };
  }

  if (normalizedPath === '/auth/logout' && method === 'POST') {
    clearCookie('logirest_token');
    return { status: 'success', message: 'Logged out successfully' };
  }

  if (normalizedPath === '/auth/refresh' && method === 'POST') {
    const token = getTokenFromCookie();
    if (!token) {
      return { error: { status: 401, code: 'SESSION_EXPIRED', message: 'Your session has expired. Please log in again.' } };
    }
    const decoded = decodeMockToken(token);
    if (!decoded || !decoded.user) {
      return { error: { status: 401, code: 'SESSION_EXPIRED', message: 'Your session has expired. Please log in again.' } };
    }
    const newToken = createMockToken(decoded.user as Record<string, unknown>);
    setCookie('logirest_token', newToken, 86400);
    return { status: 'success', expires_at: new Date(Date.now() + 86400000).toISOString() };
  }

  // --- Master Data Routes ---
  if (normalizedPath === '/branches') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.branches.findAll());
    if (method === 'POST') return db.branches.save(body as Branch);
  }
  if (normalizedPath.startsWith('/branches/')) {
    const id = normalizedPath.split('/').pop()!;
    if (method === 'GET') return db.branches.findById(id);
    if (method === 'PUT') return db.branches.save({ ...(body as Branch), id });
    if (method === 'DELETE') return db.branches.delete(id);
  }

  if (normalizedPath === '/warehouses') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.warehouses.findAll());
    if (method === 'POST') return db.warehouses.save(body as Warehouse);
  }
  if (normalizedPath.startsWith('/warehouses/')) {
    const id = normalizedPath.split('/').pop()!;
    if (method === 'GET') {
      const doc = await db.warehouses.findById(id);
      if (!doc) return undefined;
      const warehouseLots = await db.lots.findAll();
      const has_stock = warehouseLots.some(l => l?.warehouseId === id && l.qtyAvailable > 0);
      return { ...doc, has_stock };
    }
    if (method === 'PUT') return db.warehouses.save({ ...(body as Warehouse), id });
    if (method === 'DELETE') {
      const warehouseLots = await db.lots.findAll();
      const hasStock = warehouseLots.some(l => l?.warehouseId === id && l.qtyAvailable > 0);
      if (hasStock) {
        return { error: { code: 'HAS_STOCK', message: 'Cannot delete warehouse with existing stock.' } };
      }
      return db.warehouses.delete(id);
    }
  }

  if (normalizedPath === '/departments') {
    if (method === 'GET') {
      const all = await db.departments.findAll();
      const branchId = searchParams.get('branch_id');
      const filtered = branchId ? all.filter(d => d.branchId === branchId) : all;
      return MockFactory.wrapPagination(filtered);
    }
    if (method === 'POST') return db.departments.save(body as Department);
  }
  if (normalizedPath.startsWith('/departments/')) {
    const id = normalizedPath.split('/').pop()!;
    if (method === 'GET') return db.departments.findById(id);
    if (method === 'PUT') return db.departments.save({ ...(body as Department), id });
    if (method === 'DELETE') return db.departments.delete(id);
  }

  if (normalizedPath === '/items' || normalizedPath === '/master-data/items') {
    const barcode = searchParams.get('barcode');
    const all = await db.items.findAll();
    const filtered = barcode ? all.filter(i => i.barcode === barcode) : all;
    if (method === 'GET') return MockFactory.wrapPagination(filtered);
    if (method === 'POST') {
      const payload = body as Item;
      // Duplicate check for barcode or code
      const isDuplicate = all.some(i => i.barcode === payload.barcode || i.code === payload.code);
      if (isDuplicate) {
        return {
          error: {
            status: 409,
            code: 'DUPLICATE_ITEM',
            message: 'An item with this barcode or code already exists.'
          }
        };
      }
      return db.items.save(payload);
    }
  }
  
  if (normalizedPath === '/master-data/barcodes/check-duplicate') {
    if (method === 'GET') {
      const barcode = searchParams.get('barcode');
      const allItems = await db.items.findAll();
      const allBarcodes = await db.barcodes.findAll();
      const isDup = allItems.some(i => i.barcode === barcode) || allBarcodes.some(b => b.code === barcode);
      return { is_duplicate: isDup };
    }
  }
  if (normalizedPath.startsWith('/items/')) {
    const id = normalizedPath.split('/').pop()!;
    if (method === 'GET') {
      const doc = await db.items.findById(id);
      if (!doc) return undefined;
      const movements = await db.movements.findAll();
      const has_transactions = movements.some(m => m.itemId === id);
      return { ...doc, has_transactions };
    }
    if (method === 'PUT') {
      const existing = await db.items.findById(id);
      const incoming = body as Item;
      if (existing && existing.trackLots !== incoming.trackLots) {
        const movements = await db.movements.findAll();
        const hasHistory = movements.some(m => m.itemId === id);
        if (hasHistory) {
          return { error: { code: 'TRANSACTIONS_EXIST', message: 'Cannot modify lot tracking when transaction history exists.' } };
        }
      }
      return db.items.save({ ...incoming, id });
    }
    if (method === 'DELETE') return db.items.delete(id);
  }

  if (normalizedPath === '/units-of-measure') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.uoms.findAll());
    if (method === 'POST') return db.uoms.save(body as UoM);
  }
  if (normalizedPath.startsWith('/units-of-measure/')) {
    const id = normalizedPath.split('/').pop()!;
    if (method === 'GET') return db.uoms.findById(id);
    if (method === 'PUT') {
      // Manual Conflict Simulation Trigger
      if (id === 'uom-kg') {
        return {
          error: {
            status: 409,
            code: 'VERSION_CONFLICT',
            message: 'Conflict detected: this record has been modified by another user.',
            current_version: 2,
            updated_by: 'Barakat Amin',
            updatedAt: new Date().toISOString()
          }
        };
      }
      return db.uoms.save({ ...(body as UoM), id });
    }
    if (method === 'DELETE') return db.uoms.delete(id);
  }

  if (normalizedPath === '/categories') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.categories.findAll());
    if (method === 'POST') return db.categories.save(body as Category);
  }
  if (normalizedPath.startsWith('/categories/')) {
    const id = normalizedPath.split('/').pop()!;
    if (method === 'GET') return db.categories.findById(id);
    if (method === 'PUT') return db.categories.save({ ...(body as Category), id });
    if (method === 'DELETE') return db.categories.delete(id);
  }

  if (normalizedPath === '/suppliers') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.suppliers.findAll());
    if (method === 'POST') return db.suppliers.save(body as Supplier);
  }
  if (normalizedPath.startsWith('/suppliers/')) {
    const id = normalizedPath.split('/').pop()!;
    if (method === 'GET') return db.suppliers.findById(id);
    if (method === 'PUT') return db.suppliers.save({ ...(body as Supplier), id });
    if (method === 'DELETE') return db.suppliers.delete(id);
  }

  if (normalizedPath === '/currencies') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.currencies.findAll());
    if (method === 'POST') return db.currencies.save(body as Currency);
  }
  if (normalizedPath.startsWith('/currencies/')) {
    const id = normalizedPath.split('/').pop()!;
    if (method === 'GET') return db.currencies.findById(id);
    if (method === 'PUT') return db.currencies.save({ ...(body as Currency), id });
    if (method === 'DELETE') return db.currencies.delete(id);
  }

  if (normalizedPath === '/barcodes') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.barcodes.findAll());
    if (method === 'POST') return db.barcodes.save(body as Barcode);
  }
  if (normalizedPath.startsWith('/barcodes/')) {
    const id = normalizedPath.split('/').pop()!;
    if (method === 'GET') return db.barcodes.findById(id);
    if (method === 'PUT') return db.barcodes.save({ ...(body as Barcode), id });
    if (method === 'DELETE') return db.barcodes.delete(id);
  }

  // --- Issues Routes ---
  if (normalizedPath === '/operations/issues') {
    if (method === 'GET') {
      let issues = await db.issues.findAll();
      const warehouseId = searchParams.get('warehouse_id');
      const branchId = searchParams.get('branch_id');
      if (warehouseId) issues = issues.filter((i: any) => i.warehouse_id === warehouseId);
      if (branchId) issues = issues.filter((i: any) => i.branch_id === branchId || i.destination_dept_id === branchId);
      return MockFactory.wrapPagination(issues);
    }
    if (method === 'POST') {
      const issue = MockFactory.createIssue(body as StockIssue);
      const saved = await db.issues.save(issue);
      const hydrated = await hydrateIssue(saved);
      return { data: hydrated };
    }
  }
  if (normalizedPath.startsWith('/operations/issues/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3];
    const doc = await db.issues.findById(id);
    if (!doc) return undefined;

    if (method === 'GET') return hydrateIssue(doc);
    if (method === 'PUT') {
      const saved = await db.issues.save({ ...(body as StockIssue), id });
      return hydrateIssue(saved);
    }

    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const nextStatus = getNextStatusV2('ISSUE', doc.status, action as DocumentAction);
      if (nextStatus) {
        const updated = { ...doc, status: nextStatus, updatedAt: new Date().toISOString() };

        // Inventory Manifestation on POST
        if (action === 'POST') {
          updated.postedAt = new Date().toISOString();
          updated.postedBy = 'user-1';

          for (const line of doc.lines) {
            // Decement from lots
            for (const allocation of line.lotAllocations) {
              const lot = await db.lots.findById(allocation.lotId);
              if (lot) {
                lot.qtyAvailable = Math.max(0, lot.qtyAvailable - allocation.allocatedQty);
                await db.lots.save(lot);

                // Record Movement
                await recordMovement({
                  documentId: doc.id,
                  documentNumber: doc.documentNumber,
                  documentType: 'ISSUE',
                  itemId: line.itemId,
                  lotNumber: lot.lotNumber,
                  direction: 'OUT',
                  qty: allocation.allocatedQty,
                });
              }
            }
          }
        }

        const saved = await db.issues.save(updated);
        return hydrateIssue(saved);
      }
    }
  }

  // --- Transfers Routes ---
  if (normalizedPath === '/operations/transfers') {
    if (method === 'GET') {
      let transfers = await db.transfers.findAll();
      const warehouseId = searchParams.get('warehouse_id');
      const branchId = searchParams.get('branch_id');
      if (warehouseId) transfers = transfers.filter((t: any) => t.from_warehouse_id === warehouseId || t.toWarehouseId === warehouseId);
      if (branchId) transfers = transfers.filter((t: any) => t.branch_id === branchId);
      return MockFactory.wrapPagination(transfers);
    }
    if (method === 'POST') {
      const transfer = MockFactory.createTransfer(body as Transfer);
      const saved = await db.transfers.save(transfer);
      return hydrateTransfer(saved);
    }
  }
  if (normalizedPath.startsWith('/operations/transfers/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3];
    const doc = await db.transfers.findById(id);
    if (!doc) return undefined;

    if (method === 'GET') return hydrateTransfer(doc);
    if (method === 'PUT') {
      const saved = await db.transfers.save({ ...(body as Transfer), id });
      return hydrateTransfer(saved);
    }

    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const nextStatus = getNextStatusV2('TRANSFER', doc.status, action as DocumentAction);
      if (nextStatus) {
        const updated: Transfer = {
          ...doc,
          status: nextStatus,
          transferStatus: nextStatus as TransferStatus,
          updatedAt: new Date().toISOString(),
          version: (doc.version || 0) + 1
        };

        if (action === 'SHIP') updated.shippedAt = updated.updatedAt;
        if (action === 'RECEIVE') updated.receivedAt = updated.updatedAt;
        if (action === 'POST') {
          updated.postedAt = new Date().toISOString();
          updated.postedBy = 'user-1';

          for (const line of doc.lines) {
            const sourceLot = await db.lots.findById(line.lotId || '');
            if (sourceLot) {
              // 1. Decrease from source
              sourceLot.qtyAvailable = Math.max(0, sourceLot.qtyAvailable - line.shippedQty);
              await db.lots.save(sourceLot);

              // Record OUT movement
              await recordMovement({
                documentId: doc.id,
                documentNumber: doc.documentNumber,
                documentType: 'TRANSFER',
                itemId: line.itemId,
                lotNumber: sourceLot.lotNumber,
                direction: 'OUT',
                qty: line.shippedQty,
              });

              // 2. Increase in destination
              const allLots = await db.lots.findAll();
              const destLot = allLots.find(l =>
                l?.warehouseId === doc.toWarehouseId &&
                l?.itemId === line.itemId &&
                l?.lotNumber === sourceLot.lotNumber
              );

              if (destLot) {
                destLot.qtyAvailable += (line.receivedQty || line.shippedQty);
                await db.lots.save(destLot);

                // Record IN movement
                await recordMovement({
                  documentId: doc.id,
                  documentNumber: doc.documentNumber,
                  documentType: 'TRANSFER',
                  itemId: line.itemId,
                  lotNumber: destLot.lotNumber,
                  direction: 'IN',
                  qty: line.receivedQty || line.shippedQty,
                });
              } else {
                const newLotId = `lot-${Math.random().toString(36).substring(2, 11)}`;
                const newLot: Lot = {
                  id: newLotId,
                  itemId: line.itemId,
                  warehouseId: doc.toWarehouseId,
                  lotNumber: sourceLot.lotNumber,
                  expiryDate: sourceLot.expiryDate,
                  qtyAvailable: line.receivedQty || line.shippedQty,
                  isExpired: false,
                  isNearExpiry: false
                };
                await db.lots.save(newLot);

                // Record IN movement
                await recordMovement({
                  documentId: doc.id,
                  documentNumber: doc.documentNumber,
                  documentType: 'TRANSFER',
                  itemId: line.itemId,
                  lotNumber: newLot.lotNumber,
                  direction: 'IN',
                  qty: line.receivedQty || line.shippedQty,
                });
              }
            }
          }
        }

        const saved = await db.transfers.save(updated);
        return hydrateTransfer(saved);
      }
    }
    
    // Transfer Dispute Action endpoint check
    if (parts.length === 5 && parts[4] === 'dispute') {
      if (method === 'POST') {
        const updated: Transfer = {
          ...doc,
          status: 'DISPUTED' as unknown as DocumentStatus,
          transferStatus: 'DISPUTED' as TransferStatus,
          updatedAt: new Date().toISOString(),
          version: (doc.version || 0) + 1
        };
        const saved = await db.transfers.save(updated);
        return hydrateTransfer(saved);
      }
    }
  }

  // --- Stocktake Routes ---
  if (normalizedPath === '/stocktake/sessions') {
    if (method === 'GET') {
      let sessions = await db.stocktake.findAll();
      const warehouseId = searchParams.get('warehouse_id');
      const branchId = searchParams.get('branch_id');
      if (warehouseId) sessions = sessions.filter((s: any) => s.warehouse_id === warehouseId);
      if (branchId) sessions = sessions.filter((s: any) => s.branch_id === branchId);
      return MockFactory.wrapPagination(sessions.map(s => {
        const items = s.items || [];
        return {
          id: s.id,
          sessionNumber: s.sessionNumber,
          sessionName: s.sessionName,
          warehouse_id: s.warehouseId,
          status: s.status,
          snapshotAt: s.snapshotAt,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          total_items: items.length,
          counted_items: items.filter(i => i.countedQty != null).length,
        };
      }));
    }
    if (method === 'POST') {
      // Check for active session in the same warehouse
      const sessions = await db.stocktake.findAll();
      const active = sessions.find(s => s && s.warehouseId === (body as HydrationBody)?.warehouseId && s.status && !['POSTED', 'CANCELLED'].includes(s.status));
      if (active) {
        return {
          error: {
            code: 'WAREHOUSE_LOCKED',
            message: `Warehouse is locked by active session ${active.sessionNumber}`
          }
        };
      }

      // Snapshot Freeze: Capture current inventory levels from db.lots
      const warehouseLots = await db.lots.findAll();
      const warehouseItems = warehouseLots.filter(l => l?.warehouseId === (body as HydrationBody)?.warehouseId);

      // Group by item to get total quantity if there are multiple lots
      const itemTotals = warehouseItems.reduce((acc, lot) => {
        if (!acc[lot.itemId]) acc[lot.itemId] = 0;
        acc[lot.itemId] += lot.qtyAvailable;
        return acc;
      }, {} as Record<string, number>);

      // Get item details
      const allItems = await db.items.findAll();

      const stocktakeItems = Object.entries(itemTotals).map(([itemId, qty], idx) => {
        const item = allItems.find(i => i.id === itemId);
        return {
          id: `cnt-${idx + 1}`,
          itemId: itemId,
          itemName: item?.nameEn || 'Unknown Item',
          barcode: item?.barcode || '',
          uom: item?.primaryUom.code || 'UNIT',
          snapshotQty: qty,
          countedQty: null,
          variance: null,
          varianceReason: null,
          unitCost: 0 // In real system, this would come from recent GRNs or moving average
        };
      });

      const newSession = MockFactory.createStocktakeSession({
        ...(body as Record<string, unknown>),
        items: stocktakeItems,
        snapshotAt: new Date().toISOString(),
        status: STOCKTAKE_STATUS.DRAFT
      });

      return db.stocktake.save(newSession);
    }
  }

  if (normalizedPath.startsWith('/stocktake/sessions/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3]; // /stocktake/sessions/:id

    // Check if it's an item update: /stocktake/sessions/:id/items/:lineId
    if (parts.length === 6 && parts[4] === 'items') {
      const lineId = parts[5];
      const session = await db.stocktake.findById(id);
      if (!session) return undefined;

      const itemIndex = session.items.findIndex(i => i.id === lineId);
      if (itemIndex === -1) return undefined;

      session.items[itemIndex] = {
        ...session.items[itemIndex],
        countedQty: (body as Record<string, unknown>).countedQty as number | null,
        varianceReason: (body as Record<string, unknown>).variance_reason as string | null
      };

      // Auto-transition to COUNTING if currently STARTED
      if (session.status === STOCKTAKE_STATUS.STARTED) {
        session.status = STOCKTAKE_STATUS.COUNTING;
      }

      await db.stocktake.save(session);
      return session.items[itemIndex];
    }

    // Check if it's a workflow action: /stocktake/sessions/:id/:action
    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const session = await db.stocktake.findById(id);
      if (!session) return undefined;

      if (!canPerformActionV2('STOCKTAKE', session.status, action as DocumentAction, 'ADMIN')) {
        return { error: { code: 'INVALID_TRANSITION', message: `Cannot ${action} from ${session.status}` } };
      }

      const nextStatus = getNextStatusV2('STOCKTAKE', session.status, action as DocumentAction);
      if (!nextStatus) return { error: { code: 'UNKNOWN_STATUS', message: 'Next status not found' } };

      // Business Logic for specific actions
      if (action === 'START') {
        const allGrns = await db.grn.findAll();
        const allIssues = await db.issues.findAll();
        const unpostedGrns = allGrns.filter(g => g.status && g.status !== 'POSTED' && g.status !== 'CANCELLED');
        const unpostedIssues = allIssues.filter(i => i.status && i.status !== 'POSTED' && i.status !== 'CANCELLED');
        if (unpostedGrns.length > 0 || unpostedIssues.length > 0) {
          return {
            error: {
              code: 'PENDING_DOCUMENTS',
              message: 'Resolve pending GRNs and Issues before starting stocktake.'
            }
          };
        }
      }

      if (action === 'SUBMIT') {
        session.items.forEach(item => {
          const counted = item.countedQty ?? 0;
          item.variance = counted - (item.snapshotQty ?? 0);
        });
      }

      // Inventory Manifestation: ONLY at POST transition
      if (action === 'POST') {
        const warehouseLots = await db.lots.findAll();
        const lotsBackup = warehouseLots.map(l => ({ ...l }));
        try {
          for (const line of session.items) {
            const lot = warehouseLots.find(l => l && l.itemId === line.itemId && l.warehouseId === session.warehouseId);
            if (lot) {
              lot.qtyAvailable = line.countedQty ?? 0;
              await db.lots.save(lot);
            }
          }
        } catch (error) {
          // rollback
          for (const backup of lotsBackup) {
            await db.lots.save(backup);
          }
          return { error: { code: 'TRANSACTION_FAILED', message: 'Failed to post stocktake session. Rolled back.' } };
        }
      }

      const now = new Date().toISOString();
      const updated = {
        ...session,
        status: nextStatus,
        updatedAt: now,
        version: (session.version || 0) + 1,
        postedAt: nextStatus === STOCKTAKE_STATUS.POSTED ? now : session.postedAt,
        postedBy: nextStatus === STOCKTAKE_STATUS.POSTED ? 'user-1' : session.postedBy,
      };

      return db.stocktake.save(updated as StocktakeSession);
    }

    // Standard GET/PUT
    const session = await db.stocktake.findById(id);
    if (method === 'GET') {
      if (!session) return undefined;
      // Ledger Guard: Hide snapshot during counting
      const hideSnapshot = session.status === STOCKTAKE_STATUS.STARTED || session.status === STOCKTAKE_STATUS.COUNTING;
      return {
        ...session,
        items: session.items.map(i => ({
          ...i,
          snapshotQty: hideSnapshot ? null : i.snapshotQty
        }))
      };
    }
    if (method === 'PUT') return db.stocktake.save({ ...(body as StocktakeSession), id });
  }

  // --- Stocktake Export Routes ---
  if (normalizedPath.startsWith('/stocktake/sessions/') && normalizedPath.endsWith('/variance/export')) {
    const id = normalizedPath.split('/')[3];
    const session = await db.stocktake.findById(id);
    if (!session) return undefined;
    
    if (method === 'GET') {
      // Simulate CSV Export
      let csv = 'Item Code,Item Name,Expected Qty,Counted Qty,Variance,Reason\n';
      session.items.forEach(item => {
        csv += `${item.itemId},"${item.itemName}",${item.snapshotQty ?? 0},${item.countedQty ?? 0},${item.variance ?? 0},"${item.varianceReason || ''}"\n`;
      });
      return { csv };
    }
  }

  // --- Warehouse Lock Routes ---
  if (normalizedPath.startsWith('/inventory/warehouses/') && normalizedPath.endsWith('/lock')) {
    const warehouseId = normalizedPath.split('/')[3];
    const sessions = await db.stocktake.findAll();
    const active = sessions.find(s => s && s.warehouseId === warehouseId && s.status && !['POSTED', 'CANCELLED'].includes(s.status));
    return {
      isLocked: !!active,
      sessionId: active?.id || null,
      sessionNumber: active?.sessionNumber || null,
      lockStartedAt: active?.snapshotAt || null
    };
  }

  // --- Inventory Movements ---
  if (normalizedPath === '/inventory/movements') {
    if (method === 'GET') {
      const all = await db.movements.findAll();
      const type = searchParams.get('document_type');
      const filtered = type ? all.filter(m => m.transactionType === type) : all;
      // Sort by posted_at descending
      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return MockFactory.wrapPagination(filtered);
    }
  }

  // --- Lots Available ---
  if (normalizedPath === '/operations/lots-available') {
    return MockFactory.wrapPagination(await db.lots.findAll());
  }

  // --- Yield Routes ---
  if (normalizedPath === '/operations/yield') {
    if (method === 'GET') {
      return [];
    }
    if (method === 'POST') {
      return { id: 'yield-mock-1', ...(body as Record<string, unknown>), createdAt: new Date().toISOString() };
    }
    return undefined;
  }
  if (normalizedPath.startsWith('/operations/yield/')) {
    const id = normalizedPath.split('/')[3];
    if (method === 'GET') {
      return { id, recipe_name: 'Mock Recipe', category: 'protein', input_qty: 10, output_qty: 8, waste_qty: 2, yield_pct: 80, standard_yield: 85, efficiency: 94.1, createdAt: new Date().toISOString() };
    }
    return undefined;
  }

  // --- Adjustments Routes ---
  if (normalizedPath === '/operations/adjustments') {
    if (method === 'GET') {
      let adjustments = await db.adjustments.findAll();
      const warehouseId = searchParams.get('warehouse_id');
      const branchId = searchParams.get('branch_id');
      if (warehouseId) adjustments = adjustments.filter((a: any) => a.warehouse_id === warehouseId);
      if (branchId) adjustments = adjustments.filter((a: any) => a.branch_id === branchId);
      return MockFactory.wrapPagination(adjustments);
    }
    if (method === 'POST') {
      const adj = MockFactory.createAdjustment(body as Adjustment);
      const saved = await db.adjustments.save(adj);
      return hydrateAdjustment(saved);
    }
  }
  // --- Adjustment Summary Endpoint ---
  if (normalizedPath === '/operations/adjustments/summary' && method === 'GET') {
    let adjustments = await db.adjustments.findAll();
    const warehouseId = searchParams.get('warehouse_id');
    const branchId = searchParams.get('branch_id');
    if (warehouseId) adjustments = adjustments.filter((a: any) => a.warehouse_id === warehouseId);
    if (branchId) adjustments = adjustments.filter((a: any) => a.branch_id === branchId);
    return {
      total: adjustments.length,
      pending: adjustments.filter((a: any) => a.status === ADJUSTMENT_STATUS.DRAFT || a.status === ADJUSTMENT_STATUS.SUBMITTED).length,
      critical_losses: adjustments.filter((a: any) => a.reason === 'DAMAGE' || a.reason === 'THEFT').length,
    };
  }

  // --- Transfer Summary Endpoint ---
  if (normalizedPath === '/operations/transfers/summary' && method === 'GET') {
    let transfers = await db.transfers.findAll();
    const warehouseId = searchParams.get('warehouse_id');
    const branchId = searchParams.get('branch_id');
    if (warehouseId) transfers = transfers.filter((t: any) => t.from_warehouse_id === warehouseId || t.toWarehouseId === warehouseId);
    if (branchId) transfers = transfers.filter((t: any) => t.branch_id === branchId);
    const inTransit = transfers.filter((t: any) => t.transferStatus === TRANSFER_STATUS.IN_TRANSIT || t.status === TRANSFER_STATUS.IN_TRANSIT);
    const overdueDays = OPERATIONAL_CONFIG.TRANSFER_OVERDUE_DAYS;
    const overdueCount = inTransit.filter((t: any) => {
      const shippedDate = t.shipped_at || t.created_at;
      if (!shippedDate) return false;
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - overdueDays);
      return new Date(shippedDate) < threshold;
    }).length;
    return {
      total: transfers.length,
      in_transit: inTransit.length,
      overdue_count: overdueCount,
    };
  }

  // --- Stocktake Summary Endpoint ---
  if (normalizedPath === '/stocktake/sessions/summary' && method === 'GET') {
    let sessions = await db.stocktake.findAll();
    const warehouseId = searchParams.get('warehouse_id');
    const branchId = searchParams.get('branch_id');
    if (warehouseId) sessions = sessions.filter((s: any) => s.warehouse_id === warehouseId);
    if (branchId) sessions = sessions.filter((s: any) => s.branch_id === branchId);
    return {
      total: sessions.length,
      in_progress: sessions.filter((s: any) =>
        [STOCKTAKE_STATUS.DRAFT, STOCKTAKE_STATUS.STARTED, STOCKTAKE_STATUS.COUNTING, STOCKTAKE_STATUS.REVIEW].includes(s.status)
      ).length,
      posted: sessions.filter((s: any) => s.status === STOCKTAKE_STATUS.POSTED).length,
    };
  }

  if (normalizedPath.startsWith('/operations/adjustments/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3];
    const doc = await db.adjustments.findById(id);
    if (!doc) return undefined;

    if (method === 'GET') return hydrateAdjustment(doc);
    if (method === 'PUT') {
      const saved = await db.adjustments.save({ ...(body as Adjustment), id });
      return hydrateAdjustment(saved);
    }

    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const nextStatus = getNextStatusV2('ADJUSTMENT', doc.status, action as DocumentAction);
      if (nextStatus) {
        const updated = { ...doc, status: nextStatus, updatedAt: new Date().toISOString() };

        // Inventory Manifestation on POST
        if (action === 'POST') {
          updated.postedAt = updated.updatedAt;
          updated.postedBy = 'user-1';

          for (const line of doc.lines) {
            const lot = await db.lots.findById(line.lotId || '');
            if (lot) {
              if (line.direction === 'INCREASE') lot.qtyAvailable += line.qtyAdjusted;
              else lot.qtyAvailable = Math.max(0, lot.qtyAvailable - line.qtyAdjusted);
              await db.lots.save(lot);

              // Record Movement
              await recordMovement({
                documentId: doc.id,
                documentNumber: doc.documentNumber,
                documentType: 'ADJUSTMENT',
                itemId: line.itemId,
                lotNumber: lot.lotNumber,
                direction: line.direction === 'INCREASE' ? 'IN' : 'OUT',
                qty: line.qtyAdjusted,
              });
            }
          }
        }

        const saved = await db.adjustments.save(updated);
        return hydrateAdjustment(saved);
      }
    }
  }

  // --- Procurement Routes ---
  if (normalizedPath === '/procurement/purchase-requests') {
    if (method === 'GET') {
      const all = await db.pr.findAll();
      const hydrated = await Promise.all(all.map(p => hydratePR(p, p)));
      return MockFactory.wrapPagination(hydrated);
    }
    if (method === 'POST') {
      const pr = MockFactory.createPR(body as Partial<PurchaseRequest>);
      const hydrated = await hydratePR(pr, body as HydrationBody);
      const saved = await db.pr.save(hydrated);
      return hydratePR(saved, body as HydrationBody);
    }
  }
  if (normalizedPath.startsWith('/procurement/purchase-requests/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3];
    const doc = await db.pr.findById(id);
    if (!doc) return undefined;

    if (method === 'GET') {
      const hydrated = await hydratePR(doc, doc);
      return { data: hydrated };
    }

    if (method === 'PUT') {
      const hydrated = await hydratePR({ ...doc, ...(body as Partial<PurchaseRequest>) }, body as HydrationBody);
      const saved = await db.pr.save({ ...hydrated, id });
      return hydratePR(saved, body as HydrationBody);
    }

    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const nextStatus = getNextStatusV2('PR', doc.status, action as DocumentAction);
      if (nextStatus) {
        return db.pr.save({ ...doc, status: nextStatus });
      }
    }
  }

  if (normalizedPath === '/procurement/purchase-orders') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.po.findAll());
    if (method === 'POST') return db.po.save(MockFactory.createPO(body as PurchaseOrder));
  }
  if (normalizedPath.startsWith('/procurement/purchase-orders/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3];
    const doc = await db.po.findById(id);
    if (!doc) return undefined;

    if (method === 'GET') return { data: doc };
    if (method === 'PUT') return db.po.save({ ...(body as PurchaseOrder), id });

    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      
      if (action === 'EMAIL') {
        // Simulate email dispatch
        return { success: true, message: 'PO dispatched via email successfully' };
      }

      const nextStatus = getNextStatusV2('PO', doc.status, action as DocumentAction);
      if (nextStatus) {
        return db.po.save({ ...doc, status: nextStatus });
      }
    }
  }

  if (normalizedPath === '/procurement/grns') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.grn.findAll());
    if (method === 'POST') {
      const grn = MockFactory.createGRN(body as GRN);
      const saved = await db.grn.save(grn);
      const hydrated = await hydrateGRN(saved);
      return { data: hydrated };
    }
  }
  if (normalizedPath.startsWith('/procurement/grns/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3];
    const doc = await db.grn.findById(id);
    if (!doc) return undefined;

    if (method === 'GET') {
      const hydrated = await hydrateGRN(doc);
      return { data: hydrated };
    }
    if (method === 'PUT') {
      const saved = await db.grn.save({ ...(body as GRN), id });
      const hydrated = await hydrateGRN(saved);
      return { data: hydrated };
    }

    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const nextStatus = getNextStatusV2('GRN', doc.status, action as DocumentAction);
      if (nextStatus) {
        const updated = { ...doc, status: nextStatus, updatedAt: new Date().toISOString() };

        // Inventory Manifestation on POST
        if (action === 'POST') {
          updated.postedAt = updated.updatedAt;
          updated.postedBy = 'user-1';

          const warehouseLots = await db.lots.findAll();
          const lotsBackup = warehouseLots.map(l => ({ ...l }));
          const movementsBackup = [...await db.movements.findAll()];

          try {
            for (const line of doc.lines) {
              const lot = await db.lots.findById(line.lotId || '');
              if (lot) {
                lot.qtyAvailable += line.receivedQty;
                await db.lots.save(lot);

                // Record Movement
                await recordMovement({
                  documentId: doc.id,
                  documentNumber: doc.documentNumber,
                  documentType: 'GRN',
                  itemId: line.itemId,
                  lotNumber: lot.lotNumber,
                  direction: 'IN',
                  qty: line.receivedQty,
                });
              } else if (line.lot) {
                // Create new lot if it doesn't exist
                const newLot: Lot = {
                  id: line.lot.id,
                  itemId: line.itemId,
                  warehouseId: doc.warehouseId,
                  lotNumber: line.lot.lotNumber,
                  expiryDate: line.lot.expiryDate,
                  qtyAvailable: line.receivedQty,
                  isExpired: false,
                  isNearExpiry: false
                };
                await db.lots.save(newLot);

                // Record Movement
                await recordMovement({
                  documentId: doc.id,
                  documentNumber: doc.documentNumber,
                  documentType: 'GRN',
                  itemId: line.itemId,
                  lotNumber: line.lot.lotNumber,
                  direction: 'IN',
                  qty: line.receivedQty,
                });
              }
            }
          } catch (error) {
            // rollback
            for (const backup of lotsBackup) {
              await db.lots.save(backup);
            }
            // we'd need a way to restore movements, since it's an array we can just reset it but the mock adapter doesn't have an easy reset.
            // we'll leave movements as is since it's just a mock adapter, the lots are the critical part
            return { error: { code: 'TRANSACTION_FAILED', message: 'Failed to post GRN. Rolled back.' } };
          }
        }

        const saved = await db.grn.save(updated);
        const hydrated = await hydrateGRN(saved);
        return { data: hydrated };
      }
    }
  }

  if (normalizedPath === '/currencies/fx-rates') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.fxRates.findAll());
    if (method === 'POST') return db.fxRates.save(body as FXRate);
  }
  if (normalizedPath.startsWith('/currencies/fx-rates/')) {
    const id = normalizedPath.split('/').pop()!;
    if (method === 'GET') return db.fxRates.findById(id);
    if (method === 'PUT') return db.fxRates.save({ ...(body as FXRate), id });
    if (method === 'DELETE') return db.fxRates.delete(id);
  }

  if (normalizedPath === '/master-data/variance-reasons' || normalizedPath === '/operations/stocktake/variance-reasons') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.varianceReasons.findAll());
  }

  // --- Kitchen Requests Routes ---
  if (normalizedPath === '/operations/kitchen-requests') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.kitchenRequests.findAll());
    if (method === 'POST') {
      const kr = MockFactory.createKitchenRequest(body as KitchenRequestDetail);
      const saved = await db.kitchenRequests.save(kr);
      return hydrateKitchenRequest(saved);
    }
  }
  if (normalizedPath.startsWith('/operations/kitchen-requests/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3];
    const doc = await db.kitchenRequests.findById(id);
    if (!doc) return undefined;

    if (method === 'GET') return hydrateKitchenRequest(doc);
    if (method === 'PUT') {
      const saved = await db.kitchenRequests.save({ ...(body as KitchenRequestDetail), id });
      return hydrateKitchenRequest(saved);
    }

    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const nextStatus = getNextStatusV2('KITCHEN_REQUEST', doc.status, action as DocumentAction);
      if (nextStatus) {
        const saved = await db.kitchenRequests.save({ ...doc, status: nextStatus });
        return hydrateKitchenRequest(saved);
      }
    }
  }

  if (normalizedPath === '/admin/settings') {
    if (method === 'GET') {
      const movements = await db.movements.findAll();
      return {
        id: 'system_settings',
        system_name: 'LogiRest Enterprise',
        base_currency: 'SAR',
        branch_id: 'HQ',
        timezone: 'Asia/Riyadh',
        locale_default: 'en' as const,
        sender_name: 'LogiRest System',
        reply_to_email: 'no-reply@logirest.com',
        has_transactions: movements.length > 0,
        mail_provider: 'smtp' as const,
        smtp_host: 'smtp.mailtrap.io',
        smtp_port: 587,
        smtp_user: 'user',
        smtp_password: 'password',
        smtp_encryption: 'tls' as const,
        version: 1,
        updatedAt: new Date().toISOString()
      };
    }
    if (method === 'PUT') {
      const movements = await db.movements.findAll();
      const currentSettings = { base_currency: 'SAR' }; // Mocked existing state
      const newSettings = body as Record<string, any>;

      if (movements.length > 0 && newSettings.base_currency && newSettings.base_currency !== currentSettings.base_currency) {
        return {
          error: {
            code: 'TRANSACTIONS_EXIST',
            message: 'Cannot change base currency when transaction history exists.'
          }
        };
      }
      return {
        id: 'system_settings',
        system_name: newSettings.system_name || 'LogiRest Enterprise',
        base_currency: newSettings.base_currency || 'SAR',
        branch_id: newSettings.branch_id || 'HQ',
        timezone: newSettings.timezone || 'Asia/Riyadh',
        locale_default: newSettings.locale_default || 'en',
        sender_name: newSettings.sender_name || 'LogiRest System',
        reply_to_email: newSettings.reply_to_email || 'no-reply@logirest.com',
        has_transactions: movements.length > 0,
        mail_provider: newSettings.mail_provider || 'smtp',
        smtp_host: newSettings.smtp_host || '',
        smtp_port: Number(newSettings.smtp_port) || 587,
        smtp_user: newSettings.smtp_user || '',
        smtp_password: newSettings.smtp_password || '',
        smtp_encryption: newSettings.smtp_encryption || 'tls',
        version: (newSettings.version || 1) + 1,
        updatedAt: new Date().toISOString()
      };
    }
  }

  if (normalizedPath === '/admin/settings/test-email' && method === 'POST') {
    return { ok: true };
  }

  if (normalizedPath.startsWith('/lots/') && normalizedPath.endsWith('/quarantine') && method === 'PATCH') {
    const lotId = normalizedPath.split('/')[2];
    const lot = await db.lots.findById(lotId);
    if (lot) {
      const updated = { ...lot, status: 'QUARANTINE' };
      await db.lots.save(updated);
    }
    return { ok: true };
  }

  if (normalizedPath.startsWith('/lots/') && normalizedPath.endsWith('/release-quarantine') && method === 'PATCH') {
    const lotId = normalizedPath.split('/')[2];
    const lot = await db.lots.findById(lotId);
    if (lot) {
      const updated = { ...lot, status: 'ACTIVE' };
      await db.lots.save(updated);
    }
    return { ok: true };
  }

  if (normalizedPath === '/admin/outbox/failed' && method === 'GET') {
    return {
      data: [
        {
          id: 'outbox-1',
          eventType: 'EXPIRY_WARNING',
          payload: {
            to: 'admin@kitchen.io',
            subject: 'Expiring Stock Alert: LOT-100223',
            sku: 'SKU-EGGS-01',
            qty: 120,
            warehouse: 'wh-central'
          },
          status: 'FAILED',
          attempts: 5,
          lastError: 'SMTP connection timed out after 5000ms. Could not reach mailtrap.io.',
          processedAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        },
        {
          id: 'outbox-2',
          eventType: 'WAC_DISCREPANCY',
          payload: {
            to: 'manager@kitchen.io',
            subject: 'Cost consistency variance detected for SKU-BEEF-02',
            discrepancy: '0.04%'
          },
          status: 'FAILED',
          attempts: 3,
          lastError: 'Authentication failed. Invalid SMTP user/pass credentials.',
          processedAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        }
      ],
      meta: {
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      }
    };
  }

  if (normalizedPath.startsWith('/admin/outbox/') && normalizedPath.endsWith('/retry') && method === 'POST') {
    return { ok: true };
  }

  if (normalizedPath === '/admin/inventory/frozen' && method === 'GET') {
    return [
      {
        warehouse_id: 'wh-central',
        itemId: 'item-beef-02',
        qtyOnHand: 450.5,
        qtyAllocated: 20.0,
        wac: 35.50,
        isFrozen: true,
        updatedAt: new Date().toISOString(),
        warehouse: {
          id: 'wh-central',
          name: 'Central Kitchen Store',
          code: 'WH-CENTRAL'
        },
        item: {
          id: 'item-beef-02',
          name: 'Fresh Premium Angus Beef (KG)',
          sku: 'SKU-BEEF-02'
        }
      },
      {
        warehouse_id: 'wh-cold',
        itemId: 'item-salmon-01',
        qtyOnHand: 120.0,
        qtyAllocated: 5.0,
        wac: 82.00,
        isFrozen: true,
        updatedAt: new Date().toISOString(),
        warehouse: {
          id: 'wh-cold',
          name: 'Cold Storage Room B',
          code: 'WH-COLD-B'
        },
        item: {
          id: 'item-salmon-01',
          name: 'Frozen Norwegian Salmon Fillet (KG)',
          sku: 'SKU-SALMON-01'
        }
      }
    ];
  }

  if (normalizedPath.startsWith('/admin/inventory/') && normalizedPath.endsWith('/unfreeze') && method === 'POST') {
    return { ok: true };
  }

  if (normalizedPath === '/dashboard/stats') {
    if (method === 'GET') {
      const issues = await db.issues.findAll();
      const transfers = await db.transfers.findAll();
      const lots = await db.lots.findAll();
      const prs = await db.pr.findAll();
      const pos = await db.po.findAll();
      const grns = await db.grn.findAll();
      const items = await db.items.findAll();
      const stocktakes = await db.stocktake.findAll();
      const kitchenRequests = await db.kitchenRequests.findAll();

      const pending_fulfillment = kitchenRequests.filter(r => r.status === 'SUBMITTED' || r.status === 'DRAFT').length || 5;
      const pending_prs = prs.filter(p => p.status === 'DRAFT').length || 2;
      const active_stocktakes = stocktakes.filter(s => s.status === 'DRAFT').length || 1;
      const low_stock_items = items.filter(i => i.minStockLevel && i.minStockLevel > 50).length || 4;
      const near_expiry_count = lots.filter(l => l.isNearExpiry).length || 2;
      const active_pos = pos.filter(p => p.status === 'SUBMITTED').length || 2;
      const pending_grns = grns.filter(g => g.status === 'DRAFT').length || 1;

      const recent_requests = [
        ...issues.map(i => ({
          id: i.id,
          documentNumber: i.documentNumber,
          type: 'ISSUE' as const,
          status: i.status,
          priority: 'HIGH',
          items_summary: i.notes || 'Stock Issue Request',
          createdAt: i.createdAt,
          destination: i.destinationDeptId,
        })),
        ...transfers.map(t => ({
          id: t.id,
          documentNumber: t.documentNumber,
          type: 'TRANSFER' as const,
          status: t.status,
          priority: 'NORMAL',
          items_summary: t.notes || 'Warehouse Transfer Request',
          createdAt: t.createdAt,
          destination: t.toWarehouseId,
        }))
      ].slice(0, 5);

      if (recent_requests.length === 0) {
        recent_requests.push(
          {
            id: 'req-1',
            documentNumber: 'ISS-2026-001',
            type: 'ISSUE',
            status: 'DRAFT',
            priority: 'HIGH',
            items_summary: 'Beef (Frozen) x 20 KG, Cooking Oil x 5 L',
            createdAt: new Date().toISOString(),
            destination: 'Kitchen-Main',
          },
          {
            id: 'req-2',
            documentNumber: 'TRN-2026-003',
            type: 'TRANSFER',
            status: 'POSTED',
            priority: 'NORMAL',
            items_summary: 'Chicken (Fresh) x 15 CTN',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            destination: 'Branch-A WH',
          }
        );
      }

      const activity_log = [
        { id: 'act-1', itemName: 'Beef (Frozen)', qty: 20, uom: 'KG', time: '10:30', type: 'OUT (Issue)' },
        { id: 'act-2', itemName: 'Cooking Oil', qty: 5, uom: 'L', time: '11:15', type: 'OUT (Issue)' },
        { id: 'act-3', itemName: 'Tomato Paste', qty: 50, uom: 'CAN', time: '14:20', type: 'IN (GRN)' },
      ];

      const expiring_lots = await Promise.all(lots.map(async (l) => {
        const item = await db.items.findById(l.itemId);
        const wh = await db.warehouses.findById(l.warehouseId || '');
        const expiryDate = new Date(l.expiryDate || '');
        const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return {
          id: l.id,
          itemName: item ? item.nameEn : 'Unknown Item',
          lotNumber: l.lotNumber || 'LOT-UNKNOWN',
          expiry_date: l.expiryDate,
          days_left: daysLeft,
          warehouse_name: wh ? wh.name : 'Main Warehouse',
          qty: l.qtyAvailable,
          uom: item ? item.primaryUom.code : 'PCS',
        };
      }));

      const expiring_filtered = expiring_lots.filter(l => l.days_left <= 30);
      if (expiring_filtered.length === 0) {
        expiring_filtered.push({
          id: 'exp-1',
          itemName: 'Milk (Fresh)',
          lotNumber: 'LOT-M-001',
          expiry_date: new Date(Date.now() + 5 * 24 * 3600000).toISOString().split('T')[0],
          days_left: 5,
          warehouse_name: 'Cold Storage WH',
          qty: 12,
          uom: 'LTR',
        });
      }

      const fulfillment_queue = [
        ...issues.filter(i => i.status === 'POSTED').map(i => ({
          id: i.id,
          documentNumber: i.documentNumber,
          type: 'ISSUE' as const,
          status: i.status,
          priority: 'HIGH',
          items_count: i.lines?.length || 2,
          destination: i.destinationDeptId,
          createdAt: i.createdAt,
        })),
        ...transfers.filter(t => t.status === 'POSTED').map(t => ({
          id: t.id,
          documentNumber: t.documentNumber,
          type: 'TRANSFER' as const,
          status: t.status,
          priority: 'NORMAL',
          items_count: t.lines?.length || 3,
          destination: t.toWarehouseId,
          createdAt: t.createdAt,
        }))
      ].slice(0, 5);

      if (fulfillment_queue.length === 0) {
        fulfillment_queue.push({
          id: 'fq-1',
          documentNumber: 'ISS-2026-004',
          type: 'ISSUE',
          status: 'POSTED',
          priority: 'HIGH',
          items_count: 3,
          destination: 'Kitchen-Pastry',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        });
      }

      const pending_approvals = [
        ...prs.filter(p => p.status === 'DRAFT').map(p => ({
          id: p.id,
          documentNumber: p.documentNumber,
          type: 'PR' as const,
          status: p.status,
          priority: 'NORMAL',
          destination: p.warehouseId || 'Main WH',
          createdAt: p.createdAt,
          total_value: 12500,
        })),
        ...pos.filter(p => p.status === 'DRAFT').map(p => ({
          id: p.id,
          documentNumber: p.documentNumber,
          type: 'PO' as const,
          status: p.status,
          priority: 'HIGH',
          destination: p.supplierId || 'Supplier A',
          createdAt: p.createdAt,
          total_value: 34200,
        }))
      ].slice(0, 5);

      if (pending_approvals.length === 0) {
        pending_approvals.push({
          id: 'app-1',
          documentNumber: 'PR-2026-005',
          type: 'PR',
          status: 'DRAFT',
          priority: 'HIGH',
          destination: 'Cold Storage WH',
          createdAt: new Date().toISOString(),
          total_value: 15000,
        });
      }

      const top_vendors = [
        { name: 'National Poultry Co', spend: 85000, status: 'Active' },
        { name: 'Gulf Canned Goods', spend: 45000, status: 'Active' },
        { name: 'Almarai Dairy', spend: 32000, status: 'Active' },
      ];

      const efficiency_metrics = {
        po_conversion_rate: 87.5,
        fulfillment_cycle_days: 2.4,
        throughput_week: 142,
        conversion_chart: [70, 75, 80, 85, 87, 87.5],
        velocity_chart: [1.2, 1.5, 1.8, 2.0, 2.2, 2.4],
      };

      const system_audit_logs = [
        { id: 'sa-1', action: 'Update Item Info', user: 'بركات امين', time: '10:30', type: 'ITEM' },
        { id: 'sa-2', action: 'Post Stock Issue', user: 'سارة حسن', time: '09:15', type: 'ISSUE' },
        { id: 'sa-3', action: 'Create Warehouse', user: 'بركات امين', time: '14:00', type: 'WAREHOUSE' },
      ];

      return {
        total_value: 245000,
        pending_fulfillment,
        shortages: 3,
        warehouse_capacity: 78,
        pending_prs,
        active_stocktakes,
        low_stock_items,
        system_health: 99,
        active_users: 4,
        near_expiry_count,
        today_consumption: 1240,
        stock_health: 94,
        active_pos,
        pending_grns,
        total_procurement_spend: 184500,
        recent_requests,
        activity_log,
        expiring_lots: expiring_filtered,
        fulfillment_queue,
        pending_approvals,
        top_vendors,
        efficiency_metrics,
        system_audit_logs,
      };
    }
  }

  // --- Notifications Routes ---
  if (normalizedPath === '/notifications') {
    if (method === 'GET') {
      return [
        {
          id: 'notif-1',
          targetRole: 'ADMIN',
          warehouse_id: 'wh-central',
          message: 'Purchase Request PR-2026-HQ-00001 is awaiting approval.',
          isRead: false,
          createdAt: new Date().toISOString(),
          documentType: 'PURCHASE_REQUEST',
          documentId: 'pr-1'
        }
      ];
    }
  }
  if (normalizedPath.startsWith('/notifications/') && normalizedPath.endsWith('/read') && method === 'PATCH') {
    const id = normalizedPath.split('/')[2];
    return { id, isRead: true };
  }
  if (normalizedPath === '/notifications/read-all' && method === 'POST') {
    return { success: true, markedReadCount: 1 };
  }

  // --- Default Fallback ---
  console.warn(`[MockApiAdapter] Route not handled: ${method} ${path}`);
  return undefined;
}
