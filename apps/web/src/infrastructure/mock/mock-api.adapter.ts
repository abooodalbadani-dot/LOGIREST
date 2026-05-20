/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from './mock-database';
import { MockFactory } from './mock-factory';
import { PurchaseRequest, PurchaseOrder, GRN, StockIssue, Transfer, Adjustment, DocumentStatus, TransferStatus, PRLineItem } from '@/types/documents';
import { Branch, Warehouse, Department, UoM, Category, Item, Supplier, Currency, Lot, Barcode, FXRate } from '@/types/master-data';
import { StocktakeSession } from '@/features/operations/types/stocktake';
import { KitchenRequestDetail } from '@/features/operations/types/kitchen-request';

import { getNextStatusV2, canPerformActionV2, DocumentAction } from '@/core/workflow/document-engine';
import { STOCKTAKE_STATUS } from '@/contracts/statuses';

interface HydrationLine {
  id?: string;
  item_id: string;
  item?: Record<string, unknown>;
  qty?: number;
  req_qty?: number;
  lot_id?: string | null;
  uom_id?: string;
  approved_qty?: number | null;
}

interface HydrationBody {
  lines?: HydrationLine[];
  department_id?: string;
  requested_by_dept?: string;
  expected_date?: string;
  required_by_date?: string;
  warehouse_id?: string;
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
    posted_at: new Date().toISOString(),
    document_id: params.documentId,
    document_number: params.documentNumber,
    document_type: params.documentType,
    item_id: params.itemId,
    item_code: item.code,
    item_name_ar: item.name_ar,
    item_name_en: item.name_en,
    lot_number: params.lotNumber,
    direction: params.direction,
    qty: params.qty,
  });
}

/**
 * Hydrates a Purchase Request with full line item details and mappings
 */
async function hydratePR(pr: PurchaseRequest, body: HydrationBody): Promise<PurchaseRequest> {
  const lines = await Promise.all((body.lines || []).map(async (l) => {
    const item = await db.items.findById(l.item_id);
    const qty = l.qty ?? l.req_qty ?? 0;
    return {
      id: l.id || `line-${Math.random().toString(36).substring(7)}`,
      document_id: pr.id,
      item_id: l.item_id,
      item: item ? {
        id: item.id,
        code: item.code,
        name_ar: item.name_ar,
        name_en: item.name_en,
        primary_uom: item.primary_uom
      } : l.item,
      lot_id: l.lot_id || null,
      lot: null,
      qty,
      uom_id: l.uom_id || item?.primary_uom.id || '',
      unit_cost: null,
      requested_qty: qty,
      req_qty: qty, // Alias for feature schema
      approved_qty: l.approved_qty ?? null
    } as PRLineItem & { req_qty: number };
  }));

  const deptId = body.department_id || body.requested_by_dept || pr.requested_by_dept;
  const date = body.expected_date || body.required_by_date || pr.required_by_date;

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
      item_id: l.item_id,
      item: item ? {
        id: item.id,
        code: item.code,
        name_ar: item.name_ar,
        name_en: item.name_en,
        primary_uom: {
          id: item.primary_uom.id,
          code: item.primary_uom.code,
        }
      } : {
        id: l.item_id,
        code: 'CUSTOM',
        name_ar: 'Custom Item',
        name_en: 'Custom Item',
        primary_uom: { id: l.uom_id || 'uom-pcs', code: 'PCS' }
      },
      direction: l.direction || 'INCREASE',
      qty_before: l.qty_before ?? 0,
      qty_adjusted: l.qty_adjusted ?? 0,
      uom_id: l.uom_id || item?.primary_uom.id || 'uom-pcs',
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
    const item = await db.items.findById(l.item_id);
    const lot = l.lot_id ? await db.lots.findById(l.lot_id) : null;
    
    const lotAllocations = await Promise.all((l.lot_allocations || []).map(async (alloc: any) => {
      const aLot = await db.lots.findById(alloc.lot_id);
      return {
        lot_id: alloc.lot_id,
        lot_number: alloc.lot_number || aLot?.lot_number || '',
        expiry_date: alloc.expiry_date || aLot?.expiry_date || null,
        allocated_qty: alloc.allocated_qty ?? 0,
        override_reason: alloc.override_reason || null
      };
    }));

    return {
      id: l.id || `line-${Math.random().toString(36).substring(7)}`,
      document_id: doc.id,
      item_id: l.item_id,
      item: item ? {
        id: item.id,
        code: item.code,
        name_ar: item.name_ar,
        name_en: item.name_en,
        primary_uom: {
          id: item.primary_uom.id,
          code: item.primary_uom.code,
          name_ar: item.primary_uom.name_ar || item.primary_uom.code,
          name_en: item.primary_uom.name_en || item.primary_uom.code
        }
      } : {
        id: l.item_id,
        code: 'CUSTOM',
        name_ar: 'Custom Item',
        name_en: 'Custom Item',
        primary_uom: { id: l.uom_id || 'uom-pcs', code: 'PCS', name_ar: 'حبة', name_en: 'Piece' }
      },
      lot_id: l.lot_id || null,
      lot: lot ? {
        id: lot.id,
        lot_number: lot.lot_number,
        expiry_date: lot.expiry_date || null,
        is_expired: lot.is_expired || false,
      } : null,
      qty: l.qty ?? 0,
      uom_id: l.uom_id || item?.primary_uom.id || 'uom-pcs',
      unit_cost: l.unit_cost ?? null,
      requested_qty: l.requested_qty ?? l.qty ?? 0,
      issued_qty: l.issued_qty ?? 0,
      lot_allocations: lotAllocations
    };
  }));
  return { ...doc, lines };
}

/**
 * Hydrates a Transfer with lot allocations and exact null fields
 */
async function hydrateTransfer(doc: any): Promise<any> {
  const lines = await Promise.all((doc.lines || []).map(async (l: any) => {
    const item = await db.items.findById(l.item_id);
    
    const lotAllocations = await Promise.all((l.lot_allocations || []).map(async (alloc: any) => {
      const aLot = await db.lots.findById(alloc.lot_id);
      return {
        lot_id: alloc.lot_id,
        lot_number: alloc.lot_number || aLot?.lot_number || '',
        expiry_date: alloc.expiry_date || aLot?.expiry_date || null,
        allocated_qty: alloc.allocated_qty ?? 0,
        override_reason: alloc.override_reason || null
      };
    }));

    return {
      id: l.id || `line-${Math.random().toString(36).substring(7)}`,
      document_id: doc.id,
      item_id: l.item_id,
      item: item ? {
        id: item.id,
        code: item.code,
        name_ar: item.name_ar,
        name_en: item.name_en,
        primary_uom: {
          id: item.primary_uom.id,
          code: item.primary_uom.code,
          name_ar: item.primary_uom.name_ar || item.primary_uom.code,
          name_en: item.primary_uom.name_en || item.primary_uom.code
        }
      } : {
        id: l.item_id,
        code: 'CUSTOM',
        name_ar: 'Custom Item',
        name_en: 'Custom Item',
        primary_uom: { id: l.uom_id || 'uom-pcs', code: 'PCS', name_ar: 'حبة', name_en: 'Piece' }
      },
      lot_id: l.lot_id || null,
      lot: null,
      qty: l.qty ?? 0,
      unit_cost: null,
      shipped_qty: l.shipped_qty ?? l.qty ?? 0,
      received_qty: l.received_qty !== undefined ? l.received_qty : null,
      uom_id: l.uom_id || item?.primary_uom.id || 'uom-pcs',
      lot_allocations: lotAllocations
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
      item_id: l.item_id,
      item_name: item ? (item.name_en || item.name_ar) : 'Custom Item',
      uom: item ? item.primary_uom.code : 'PCS',
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
        lot_number: l.lot.lot_number || '',
        expiry_date: l.lot.expiry_date || null
      };
    } else if (l.lot_id) {
      const dbLot = await db.lots.findById(l.lot_id);
      if (dbLot) {
        lotVal = {
          id: dbLot.id,
          lot_number: dbLot.lot_number,
          expiry_date: dbLot.expiry_date || null
        };
      }
    }

    return {
      id: l.id || `line-${Math.random().toString(36).substring(7)}`,
      item: item ? {
        id: item.id,
        code: item.code,
        name_ar: item.name_ar,
        name_en: item.name_en,
        primary_uom: {
          id: item.primary_uom.id,
          code: item.primary_uom.code
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
      received_qty: l.received_qty ?? l.qty ?? 0,
      uom_id: l.uom_id || item?.primary_uom.id || 'uom-pcs',
      unit_cost_foreign: l.unit_cost_foreign ?? null,
      unit_cost_base: l.unit_cost_base ?? null
    };
  }));

  return {
    ...doc,
    supplier: supplier ? {
      id: supplier.id,
      name: supplier.name_en || supplier.name_ar || ''
    } : undefined,
    lines
  };
}

/**
 * Mock API Adapter
 * Acts as a bridge between the application's API calls and the Mock Repositories.
 */
export async function getMockResponse(method: string, path: string, body?: unknown): Promise<unknown> {
  const normalizedPath = path.split('?')[0];
  const searchParams = new URLSearchParams(path.split('?')[1] || '');

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
      const has_stock = warehouseLots.some(l => l?.warehouse_id === id && l.qty_available > 0);
      return { ...doc, has_stock };
    }
    if (method === 'PUT') return db.warehouses.save({ ...(body as Warehouse), id });
    if (method === 'DELETE') {
      const warehouseLots = await db.lots.findAll();
      const hasStock = warehouseLots.some(l => l?.warehouse_id === id && l.qty_available > 0);
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
      const filtered = branchId ? all.filter(d => d.branch_id === branchId) : all;
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
      const has_transactions = movements.some(m => m.item_id === id);
      return { ...doc, has_transactions };
    }
    if (method === 'PUT') {
      const existing = await db.items.findById(id);
      const incoming = body as Item;
      if (existing && existing.track_lots !== incoming.track_lots) {
        const movements = await db.movements.findAll();
        const hasHistory = movements.some(m => m.item_id === id);
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
            updated_at: new Date().toISOString()
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
    if (method === 'GET') return MockFactory.wrapPagination(await db.issues.findAll());
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
        const updated = { ...doc, status: nextStatus, updated_at: new Date().toISOString() };

        // Inventory Manifestation on POST
        if (action === 'POST') {
          updated.posted_at = new Date().toISOString();
          updated.posted_by = 'user-1';

          for (const line of doc.lines) {
            // Decement from lots
            for (const allocation of line.lot_allocations) {
              const lot = await db.lots.findById(allocation.lot_id);
              if (lot) {
                lot.qty_available = Math.max(0, lot.qty_available - allocation.allocated_qty);
                await db.lots.save(lot);

                // Record Movement
                await recordMovement({
                  documentId: doc.id,
                  documentNumber: doc.document_number,
                  documentType: 'ISSUE',
                  itemId: line.item_id,
                  lotNumber: lot.lot_number,
                  direction: 'OUT',
                  qty: allocation.allocated_qty,
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
    if (method === 'GET') return MockFactory.wrapPagination(await db.transfers.findAll());
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
          transfer_status: nextStatus as TransferStatus,
          updated_at: new Date().toISOString(),
          version: (doc.version || 0) + 1
        };

        if (action === 'SHIP') updated.shipped_at = updated.updated_at;
        if (action === 'RECEIVE') updated.received_at = updated.updated_at;
        if (action === 'POST') {
          updated.posted_at = new Date().toISOString();
          updated.posted_by = 'user-1';

          for (const line of doc.lines) {
            const sourceLot = await db.lots.findById(line.lot_id || '');
            if (sourceLot) {
              // 1. Decrease from source
              sourceLot.qty_available = Math.max(0, sourceLot.qty_available - line.shipped_qty);
              await db.lots.save(sourceLot);

              // Record OUT movement
              await recordMovement({
                documentId: doc.id,
                documentNumber: doc.document_number,
                documentType: 'TRANSFER',
                itemId: line.item_id,
                lotNumber: sourceLot.lot_number,
                direction: 'OUT',
                qty: line.shipped_qty,
              });

              // 2. Increase in destination
              const allLots = await db.lots.findAll();
              const destLot = allLots.find(l =>
                l?.warehouse_id === doc.to_warehouse_id &&
                l?.item_id === line.item_id &&
                l?.lot_number === sourceLot.lot_number
              );

              if (destLot) {
                destLot.qty_available += (line.received_qty || line.shipped_qty);
                await db.lots.save(destLot);

                // Record IN movement
                await recordMovement({
                  documentId: doc.id,
                  documentNumber: doc.document_number,
                  documentType: 'TRANSFER',
                  itemId: line.item_id,
                  lotNumber: destLot.lot_number,
                  direction: 'IN',
                  qty: line.received_qty || line.shipped_qty,
                });
              } else {
                const newLotId = `lot-${Math.random().toString(36).substring(2, 11)}`;
                const newLot = {
                  id: newLotId,
                  item_id: line.item_id,
                  warehouse_id: doc.to_warehouse_id,
                  lot_number: sourceLot.lot_number,
                  expiry_date: sourceLot.expiry_date,
                  qty_available: line.received_qty || line.shipped_qty,
                  is_expired: false,
                  is_near_expiry: false
                } as Lot;
                await db.lots.save(newLot);

                // Record IN movement
                await recordMovement({
                  documentId: doc.id,
                  documentNumber: doc.document_number,
                  documentType: 'TRANSFER',
                  itemId: line.item_id,
                  lotNumber: newLot.lot_number,
                  direction: 'IN',
                  qty: line.received_qty || line.shipped_qty,
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
          transfer_status: 'DISPUTED' as TransferStatus,
          updated_at: new Date().toISOString(),
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
      const sessions = await db.stocktake.findAll();
      return MockFactory.wrapPagination(sessions.map(s => {
        const items = s.items || [];
        return {
          id: s.id,
          session_number: s.session_number,
          session_name: s.session_name,
          warehouse_id: s.warehouse_id,
          status: s.status,
          snapshot_at: s.snapshot_at,
          created_at: s.created_at,
          updated_at: s.updated_at,
          total_items: items.length,
          counted_items: items.filter(i => i.counted_qty != null).length,
        };
      }));
    }
    if (method === 'POST') {
      // Check for active session in the same warehouse
      const sessions = await db.stocktake.findAll();
      const active = sessions.find(s => s && s.warehouse_id === (body as HydrationBody)?.warehouse_id && s.status && !['POSTED', 'CANCELLED'].includes(s.status));
      if (active) {
        return {
          error: {
            code: 'WAREHOUSE_LOCKED',
            message: `Warehouse is locked by active session ${active.session_number}`
          }
        };
      }

      // Snapshot Freeze: Capture current inventory levels from db.lots
      const warehouseLots = await db.lots.findAll();
      const warehouseItems = warehouseLots.filter(l => l?.warehouse_id === (body as HydrationBody)?.warehouse_id);

      // Group by item to get total quantity if there are multiple lots
      const itemTotals = warehouseItems.reduce((acc, lot) => {
        if (!acc[lot.item_id]) acc[lot.item_id] = 0;
        acc[lot.item_id] += lot.qty_available;
        return acc;
      }, {} as Record<string, number>);

      // Get item details
      const allItems = await db.items.findAll();

      const stocktakeItems = Object.entries(itemTotals).map(([itemId, qty], idx) => {
        const item = allItems.find(i => i.id === itemId);
        return {
          id: `cnt-${idx + 1}`,
          item_id: itemId,
          item_name: item?.name_en || 'Unknown Item',
          barcode: item?.barcode || '',
          uom: item?.primary_uom.code || 'UNIT',
          snapshot_qty: qty,
          counted_qty: null,
          variance: null,
          variance_reason: null,
          unit_cost: 0 // In real system, this would come from recent GRNs or moving average
        };
      });

      const newSession = MockFactory.createStocktakeSession({
        ...(body as Record<string, unknown>),
        items: stocktakeItems,
        snapshot_at: new Date().toISOString(),
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
        counted_qty: (body as Record<string, unknown>).counted_qty as number | null,
        variance_reason: (body as Record<string, unknown>).variance_reason as string | null
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
          const counted = item.counted_qty ?? 0;
          item.variance = counted - (item.snapshot_qty ?? 0);
        });
      }

      // Inventory Manifestation: ONLY at POST transition
      if (action === 'POST') {
        const warehouseLots = await db.lots.findAll();
        const lotsBackup = warehouseLots.map(l => ({ ...l }));
        try {
          for (const line of session.items) {
            const lot = warehouseLots.find(l => l && l.item_id === line.item_id && l.warehouse_id === session.warehouse_id);
            if (lot) {
              lot.qty_available = line.counted_qty ?? 0;
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
        updated_at: now,
        version: (session.version || 0) + 1,
        posted_at: nextStatus === STOCKTAKE_STATUS.POSTED ? now : session.posted_at,
        posted_by: nextStatus === STOCKTAKE_STATUS.POSTED ? 'user-1' : session.posted_by,
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
          snapshot_qty: hideSnapshot ? null : i.snapshot_qty
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
        csv += `${item.item_id},"${item.item_name}",${item.snapshot_qty ?? 0},${item.counted_qty ?? 0},${item.variance ?? 0},"${item.variance_reason || ''}"\n`;
      });
      return { csv };
    }
  }

  // --- Warehouse Lock Routes ---
  if (normalizedPath.startsWith('/inventory/warehouses/') && normalizedPath.endsWith('/lock')) {
    const warehouseId = normalizedPath.split('/')[3];
    const sessions = await db.stocktake.findAll();
    const active = sessions.find(s => s && s.warehouse_id === warehouseId && s.status && !['POSTED', 'CANCELLED'].includes(s.status));
    return {
      isLocked: !!active,
      sessionId: active?.id || null,
      sessionNumber: active?.session_number || null,
      lockStartedAt: active?.snapshot_at || null
    };
  }

  // --- Inventory Movements ---
  if (normalizedPath === '/inventory/movements') {
    if (method === 'GET') {
      const all = await db.movements.findAll();
      const type = searchParams.get('document_type');
      const filtered = type ? all.filter(m => m.document_type === type) : all;
      // Sort by posted_at descending
      filtered.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
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
      return { id: 'yield-mock-1', ...body, created_at: new Date().toISOString() };
    }
    return undefined;
  }
  if (normalizedPath.startsWith('/operations/yield/')) {
    const id = normalizedPath.split('/')[3];
    if (method === 'GET') {
      return { id, recipe_name: 'Mock Recipe', category: 'protein', input_qty: 10, output_qty: 8, waste_qty: 2, yield_pct: 80, standard_yield: 85, efficiency: 94.1, created_at: new Date().toISOString() };
    }
    return undefined;
  }

  // --- Adjustments Routes ---
  if (normalizedPath === '/operations/adjustments') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.adjustments.findAll());
    if (method === 'POST') {
      const adj = MockFactory.createAdjustment(body as Adjustment);
      const saved = await db.adjustments.save(adj);
      return hydrateAdjustment(saved);
    }
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
        const updated = { ...doc, status: nextStatus, updated_at: new Date().toISOString() };

        // Inventory Manifestation on POST
        if (action === 'POST') {
          updated.posted_at = updated.updated_at;
          updated.posted_by = 'user-1';

          for (const line of doc.lines) {
            const lot = await db.lots.findById(line.lot_id || '');
            if (lot) {
              if (line.direction === 'INCREASE') lot.qty_available += line.qty_adjusted;
              else lot.qty_available = Math.max(0, lot.qty_available - line.qty_adjusted);
              await db.lots.save(lot);

              // Record Movement
              await recordMovement({
                documentId: doc.id,
                documentNumber: doc.document_number,
                documentType: 'ADJUSTMENT',
                itemId: line.item_id,
                lotNumber: lot.lot_number,
                direction: line.direction === 'INCREASE' ? 'IN' : 'OUT',
                qty: line.qty_adjusted,
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
        const updated = { ...doc, status: nextStatus, updated_at: new Date().toISOString() };

        // Inventory Manifestation on POST
        if (action === 'POST') {
          updated.posted_at = updated.updated_at;
          updated.posted_by = 'user-1';

          const warehouseLots = await db.lots.findAll();
          const lotsBackup = warehouseLots.map(l => ({ ...l }));
          const movementsBackup = [...await db.movements.findAll()];

          try {
            for (const line of doc.lines) {
              const lot = await db.lots.findById(line.lot_id || '');
              if (lot) {
                lot.qty_available += line.received_qty;
                await db.lots.save(lot);

                // Record Movement
                await recordMovement({
                  documentId: doc.id,
                  documentNumber: doc.document_number,
                  documentType: 'GRN',
                  itemId: line.item_id,
                  lotNumber: lot.lot_number,
                  direction: 'IN',
                  qty: line.received_qty,
                });
              } else if (line.lot) {
                // Create new lot if it doesn't exist
                await db.lots.save({
                  id: line.lot.id,
                  item_id: line.item_id,
                  warehouse_id: doc.warehouse_id,
                  lot_number: line.lot.lot_number,
                  expiry_date: line.lot.expiry_date,
                  qty_available: line.received_qty,
                  is_expired: false,
                  is_near_expiry: false
                });

                // Record Movement
                await recordMovement({
                  documentId: doc.id,
                  documentNumber: doc.document_number,
                  documentType: 'GRN',
                  itemId: line.item_id,
                  lotNumber: line.lot.lot_number,
                  direction: 'IN',
                  qty: line.received_qty,
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
        system_name: 'LogiRest Enterprise',
        base_currency: 'SAR',
        default_language: 'en',
        sender_name: 'LogiRest System',
        reply_to_email: 'no-reply@logirest.com',
        has_transactions: movements.length > 0
      };
    }
    if (method === 'PUT') {
      const movements = await db.movements.findAll();
      const currentSettings = { base_currency: 'SAR' }; // Mocked existing state
      const newSettings = body as Record<string, string>;

      if (movements.length > 0 && newSettings.base_currency && newSettings.base_currency !== currentSettings.base_currency) {
        return {
          error: {
            code: 'TRANSACTIONS_EXIST',
            message: 'Cannot change base currency when transaction history exists.'
          }
        };
      }
      return newSettings;
    }
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
      const low_stock_items = items.filter(i => i.min_stock_level && i.min_stock_level > 50).length || 4;
      const near_expiry_count = lots.filter(l => l.is_near_expiry).length || 2;
      const active_pos = pos.filter(p => p.status === 'SUBMITTED').length || 2;
      const pending_grns = grns.filter(g => g.status === 'DRAFT').length || 1;

      const recent_requests = [
        ...issues.map(i => ({
          id: i.id,
          document_number: i.document_number,
          type: 'ISSUE' as const,
          status: i.status,
          priority: 'HIGH',
          items_summary: i.notes || 'Stock Issue Request',
          created_at: i.created_at,
          destination: i.destination_dept_id,
        })),
        ...transfers.map(t => ({
          id: t.id,
          document_number: t.document_number,
          type: 'TRANSFER' as const,
          status: t.status,
          priority: 'NORMAL',
          items_summary: t.notes || 'Warehouse Transfer Request',
          created_at: t.created_at,
          destination: t.to_warehouse_id,
        }))
      ].slice(0, 5);

      if (recent_requests.length === 0) {
        recent_requests.push(
          {
            id: 'req-1',
            document_number: 'ISS-2026-001',
            type: 'ISSUE',
            status: 'DRAFT',
            priority: 'HIGH',
            items_summary: 'Beef (Frozen) x 20 KG, Cooking Oil x 5 L',
            created_at: new Date().toISOString(),
            destination: 'Kitchen-Main',
          },
          {
            id: 'req-2',
            document_number: 'TRN-2026-003',
            type: 'TRANSFER',
            status: 'POSTED',
            priority: 'NORMAL',
            items_summary: 'Chicken (Fresh) x 15 CTN',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            destination: 'Branch-A WH',
          }
        );
      }

      const activity_log = [
        { id: 'act-1', item_name: 'Beef (Frozen)', qty: 20, uom: 'KG', time: '10:30', type: 'OUT (Issue)' },
        { id: 'act-2', item_name: 'Cooking Oil', qty: 5, uom: 'L', time: '11:15', type: 'OUT (Issue)' },
        { id: 'act-3', item_name: 'Tomato Paste', qty: 50, uom: 'CAN', time: '14:20', type: 'IN (GRN)' },
      ];

      const expiring_lots = await Promise.all(lots.map(async (l) => {
        const item = await db.items.findById(l.item_id);
        const wh = await db.warehouses.findById(l.warehouse_id || '');
        const expiryDate = new Date(l.expiry_date || '');
        const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return {
          id: l.id,
          item_name: item ? item.name_en : 'Unknown Item',
          lot_number: l.lot_number || 'LOT-UNKNOWN',
          expiry_date: l.expiry_date,
          days_left: daysLeft,
          warehouse_name: wh ? wh.name_en : 'Main Warehouse',
          qty: l.qty_available,
          uom: item ? item.primary_uom.code : 'PCS',
        };
      }));

      const expiring_filtered = expiring_lots.filter(l => l.days_left <= 30);
      if (expiring_filtered.length === 0) {
        expiring_filtered.push({
          id: 'exp-1',
          item_name: 'Milk (Fresh)',
          lot_number: 'LOT-M-001',
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
          document_number: i.document_number,
          type: 'ISSUE' as const,
          status: i.status,
          priority: 'HIGH',
          items_count: i.lines?.length || 2,
          destination: i.destination_dept_id,
          created_at: i.created_at,
        })),
        ...transfers.filter(t => t.status === 'POSTED').map(t => ({
          id: t.id,
          document_number: t.document_number,
          type: 'TRANSFER' as const,
          status: t.status,
          priority: 'NORMAL',
          items_count: t.lines?.length || 3,
          destination: t.to_warehouse_id,
          created_at: t.created_at,
        }))
      ].slice(0, 5);

      if (fulfillment_queue.length === 0) {
        fulfillment_queue.push({
          id: 'fq-1',
          document_number: 'ISS-2026-004',
          type: 'ISSUE',
          status: 'POSTED',
          priority: 'HIGH',
          items_count: 3,
          destination: 'Kitchen-Pastry',
          created_at: new Date(Date.now() - 7200000).toISOString(),
        });
      }

      const pending_approvals = [
        ...prs.filter(p => p.status === 'DRAFT').map(p => ({
          id: p.id,
          document_number: p.document_number,
          type: 'PR' as const,
          status: p.status,
          priority: 'NORMAL',
          destination: p.warehouse_id || 'Main WH',
          created_at: p.created_at,
          total_value: 12500,
        })),
        ...pos.filter(p => p.status === 'DRAFT').map(p => ({
          id: p.id,
          document_number: p.document_number,
          type: 'PO' as const,
          status: p.status,
          priority: 'HIGH',
          destination: p.supplier_id || 'Supplier A',
          created_at: p.created_at,
          total_value: 34200,
        }))
      ].slice(0, 5);

      if (pending_approvals.length === 0) {
        pending_approvals.push({
          id: 'app-1',
          document_number: 'PR-2026-005',
          type: 'PR',
          status: 'DRAFT',
          priority: 'HIGH',
          destination: 'Cold Storage WH',
          created_at: new Date().toISOString(),
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

  // --- Default Fallback ---
  console.warn(`[MockApiAdapter] Route not handled: ${method} ${path}`);
  return undefined;
}
