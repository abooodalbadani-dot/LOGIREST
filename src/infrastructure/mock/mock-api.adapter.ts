import { db } from './mock-database';
import { MockFactory } from './mock-factory';
import { getNextStatusV2, canPerformActionV2 } from '@/core/workflow/document-engine';
import { STOCKTAKE_STATUS } from '@/contracts/statuses';

/**
 * Mock API Adapter
 * Acts as a bridge between the application's API calls and the Mock Repositories.
 */
export async function getMockResponse(method: string, path: string, body?: any): Promise<unknown> {
  const normalizedPath = path.split('?')[0];
  const searchParams = new URLSearchParams(path.split('?')[1] || '');
  
  // --- Master Data Routes ---
  if (normalizedPath === '/branches') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.branches.findAll());
    if (method === 'POST') return db.branches.save(body);
  }
  if (normalizedPath.startsWith('/branches/')) {
    const id = normalizedPath.split('/').pop()!;
    if (method === 'GET') return db.branches.findById(id);
    if (method === 'PUT') return db.branches.save({ ...body, id });
  }

  if (normalizedPath === '/warehouses') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.warehouses.findAll());
    if (method === 'POST') return db.warehouses.save(body);
  }
  if (normalizedPath.startsWith('/warehouses/')) {
    const id = normalizedPath.split('/').pop()!;
    if (method === 'GET') return db.warehouses.findById(id);
    if (method === 'PUT') return db.warehouses.save({ ...body, id });
  }

  if (normalizedPath === '/items' || normalizedPath === '/master-data/items') {
    const barcode = searchParams.get('barcode');
    const all = await db.items.findAll();
    const filtered = barcode ? all.filter(i => i.barcode === barcode) : all;
    if (method === 'GET') return MockFactory.wrapPagination(filtered);
    if (method === 'POST') return db.items.save(body);
  }

  if (normalizedPath === '/units-of-measure') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.uoms.findAll());
    if (method === 'POST') return db.uoms.save(body);
  }

  if (normalizedPath === '/categories') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.categories.findAll());
    if (method === 'POST') return db.categories.save(body);
  }

  if (normalizedPath === '/suppliers') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.suppliers.findAll());
    if (method === 'POST') return db.suppliers.save(body);
  }

  if (normalizedPath === '/currencies') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.currencies.findAll());
    if (method === 'POST') return db.currencies.save(body);
  }

  // --- Issues Routes ---
  if (normalizedPath === '/operations/issues') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.issues.findAll());
    if (method === 'POST') return db.issues.save(MockFactory.createIssue(body));
  }
  if (normalizedPath.startsWith('/operations/issues/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3];
    const doc = await db.issues.findById(id);
    if (!doc) return undefined;

    if (method === 'GET') return doc;
    if (method === 'PUT') return db.issues.save({ ...body, id });

    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const nextStatus = getNextStatusV2('ISSUE', doc.status, action as any);
      if (nextStatus) {
        const updated = { ...doc, status: nextStatus as any, updated_at: new Date().toISOString() };
        
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
              }
            }
          }
        }
        
        return db.issues.save(updated);
      }
    }
  }

  // --- Transfers Routes ---
  if (normalizedPath === '/operations/transfers') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.transfers.findAll());
    if (method === 'POST') return db.transfers.save(MockFactory.createTransfer(body));
  }
  if (normalizedPath.startsWith('/operations/transfers/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3];
    const doc = await db.transfers.findById(id);
    if (!doc) return undefined;

    if (method === 'GET') return doc;
    if (method === 'PUT') return db.transfers.save({ ...body, id });

    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const nextStatus = getNextStatusV2('TRANSFER', doc.status, action as any);
      if (nextStatus) {
        const updated = { 
          ...doc, 
          status: nextStatus as any, 
          transfer_status: nextStatus as any,
          updated_at: new Date().toISOString() 
        };

        if (action === 'SHIP') updated.shipped_at = updated.updated_at;
        if (action === 'RECEIVE') updated.received_at = updated.updated_at;
        if (action === 'POST') {
          updated.posted_at = new Date().toISOString();
          updated.posted_by = 'user-1';
          
          // Move items from Source to Destination
          for (const line of doc.lines) {
            const sourceLot = await db.lots.findById(line.lot_id || '');
            if (sourceLot) {
              // 1. Decrease from source
              sourceLot.qty_available = Math.max(0, sourceLot.qty_available - line.shipped_qty);
              await db.lots.save(sourceLot);

              // 2. Increase in destination
              const allLots = await db.lots.findAll();
              let destLot = allLots.find(l => 
                l.warehouse_id === doc.to_warehouse_id && 
                l.item_id === line.item_id && 
                l.lot_number === sourceLot.lot_number
              );

              if (destLot) {
                destLot.qty_available += (line.received_qty || line.shipped_qty);
                await db.lots.save(destLot);
              } else {
                // Create new lot in destination warehouse
                await db.lots.save({
                  id: `lot-${Math.random().toString(36).substr(2, 9)}`,
                  item_id: line.item_id,
                  warehouse_id: doc.to_warehouse_id,
                  lot_number: sourceLot.lot_number,
                  expiry_date: sourceLot.expiry_date,
                  qty_available: line.received_qty || line.shipped_qty,
                  is_active: true,
                  created_at: new Date().toISOString()
                } as any);
              }
            }
          }
        }

        return db.transfers.save(updated);
      }
    }
  }

  // --- Stocktake Routes ---
  // ... existing stocktake routes ...
  if (normalizedPath === '/stocktake/sessions') {
    if (method === 'GET') {
      const sessions = await db.stocktake.findAll();
      return MockFactory.wrapPagination(sessions.map(s => ({
        id: s.id,
        session_number: s.session_number,
        session_name: s.session_name,
        warehouse_id: s.warehouse_id,
        status: s.status,
        snapshot_at: s.snapshot_at,
        created_at: s.created_at,
        updated_at: s.updated_at
      })));
    }
    if (method === 'POST') {
      // Check for active session in the same warehouse
      const sessions = await db.stocktake.findAll();
      const active = sessions.find(s => s.warehouse_id === body.warehouse_id && !['POSTED', 'CANCELLED'].includes(s.status));
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
      const warehouseItems = warehouseLots.filter(l => l.warehouse_id === body.warehouse_id);
      
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
        ...body,
        items: stocktakeItems,
        snapshot_at: new Date().toISOString(),
        status: STOCKTAKE_STATUS.DRAFT as any
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
        counted_qty: body.counted_qty,
        variance_reason: body.variance_reason
      };

      // Auto-transition to COUNTING if currently STARTED
      if (session.status === STOCKTAKE_STATUS.STARTED) {
        session.status = STOCKTAKE_STATUS.COUNTING as any;
      }

      await db.stocktake.save(session);
      return session.items[itemIndex];
    }

    // Check if it's a workflow action: /stocktake/sessions/:id/:action
    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const session = await db.stocktake.findById(id);
      if (!session) return undefined;

      if (!canPerformActionV2('STOCKTAKE', session.status, action as any, 'ADMIN')) {
        return { error: { code: 'INVALID_TRANSITION', message: `Cannot ${action} from ${session.status}` } };
      }

      const nextStatus = getNextStatusV2('STOCKTAKE', session.status, action as any);
      if (!nextStatus) return { error: { code: 'UNKNOWN_STATUS', message: 'Next status not found' } };

      // Business Logic for specific actions
      if (action === 'SUBMIT') {
        session.items.forEach(item => {
          const counted = item.counted_qty ?? 0;
          item.variance = counted - (item.snapshot_qty ?? 0);
        });
      }

      // Inventory Manifestation: ONLY at POST transition
      if (action === 'POST') {
        const warehouseLots = await db.lots.findAll();
        for (const line of session.items) {
          const lot = warehouseLots.find(l => l.item_id === line.item_id && l.warehouse_id === session.warehouse_id);
          if (lot) {
            lot.qty_available = line.counted_qty ?? 0;
            await db.lots.save(lot);
          }
        }
      }

      const now = new Date().toISOString();
      const updated = {
        ...session,
        status: nextStatus as any,
        updated_at: now,
        version: (session.version || 0) + 1,
        posted_at: nextStatus === STOCKTAKE_STATUS.POSTED ? now : session.posted_at,
        posted_by: nextStatus === STOCKTAKE_STATUS.POSTED ? 'user-1' : session.posted_by,
      };

      return db.stocktake.save(updated);
    }

    // Standard GET/PUT
    const session = await db.stocktake.findById(id);
    if (method === 'GET') {
      if (!session) return undefined;
      // Ledger Guard: Hide snapshot during counting
      const hideSnapshot = [STOCKTAKE_STATUS.STARTED, STOCKTAKE_STATUS.COUNTING].includes(session.status as any);
      return {
        ...session,
        items: session.items.map(i => ({
          ...i,
          snapshot_qty: hideSnapshot ? null : i.snapshot_qty
        }))
      };
    }
    if (method === 'PUT') return db.stocktake.save({ ...body, id });
  }

  // --- Warehouse Lock Routes ---
  if (normalizedPath.startsWith('/inventory/warehouses/') && path.endsWith('/lock')) {
    const warehouseId = normalizedPath.split('/')[3];
    const sessions = await db.stocktake.findAll();
    const active = sessions.find(s => s.warehouse_id === warehouseId && !['POSTED', 'CANCELLED'].includes(s.status));
    return {
      isLocked: !!active,
      sessionId: active?.id || null,
      sessionNumber: active?.session_number || null,
      lockStartedAt: active?.snapshot_at || null
    };
  }

  // --- Lots Available ---
  if (normalizedPath === '/operations/lots-available') {
    return MockFactory.wrapPagination(await db.lots.findAll());
  }

  // --- Adjustments Routes ---
  if (normalizedPath === '/operations/adjustments') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.adjustments.findAll());
    if (method === 'POST') return db.adjustments.save(MockFactory.createAdjustment(body));
  }
  if (normalizedPath.startsWith('/operations/adjustments/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3];
    const doc = await db.adjustments.findById(id);
    if (!doc) return undefined;

    if (method === 'GET') return doc;
    if (method === 'PUT') return db.adjustments.save({ ...body, id });

    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const nextStatus = getNextStatusV2('ADJUSTMENT', doc.status, action as any);
      if (nextStatus) {
        const updated = { ...doc, status: nextStatus as any, updated_at: new Date().toISOString() };
        
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
            }
          }
        }
        
        return db.adjustments.save(updated);
      }
    }
  }


  // --- Procurement Routes ---
  if (normalizedPath === '/procurement/purchase-requests') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.pr.findAll());
    if (method === 'POST') return db.pr.save(MockFactory.createPR(body));
  }
  if (normalizedPath.startsWith('/procurement/purchase-requests/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3];
    const doc = await db.pr.findById(id);
    if (!doc) return undefined;

    if (method === 'GET') return doc;
    if (method === 'PUT') return db.pr.save({ ...body, id });

    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const nextStatus = getNextStatusV2('PR', doc.status, action as any);
      if (nextStatus) {
        return db.pr.save({ ...doc, status: nextStatus as any });
      }
    }
  }

  if (normalizedPath === '/procurement/purchase-orders') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.po.findAll());
    if (method === 'POST') return db.po.save(MockFactory.createPO(body));
  }
  if (normalizedPath.startsWith('/procurement/purchase-orders/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3];
    const doc = await db.po.findById(id);
    if (!doc) return undefined;

    if (method === 'GET') return doc;
    if (method === 'PUT') return db.po.save({ ...body, id });

    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const nextStatus = getNextStatusV2('PO', doc.status, action as any);
      if (nextStatus) {
        return db.po.save({ ...doc, status: nextStatus as any });
      }
    }
  }

  if (normalizedPath === '/procurement/grns') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.grn.findAll());
    if (method === 'POST') return db.grn.save(MockFactory.createGRN(body));
  }
  if (normalizedPath.startsWith('/procurement/grns/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3];
    const doc = await db.grn.findById(id);
    if (!doc) return undefined;

    if (method === 'GET') return doc;
    if (method === 'PUT') return db.grn.save({ ...body, id });

    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const nextStatus = getNextStatusV2('GRN', doc.status, action as any);
      if (nextStatus) {
        const updated = { ...doc, status: nextStatus as any, updated_at: new Date().toISOString() };
        
        // Inventory Manifestation on POST
        if (action === 'POST') {
          updated.posted_at = updated.updated_at;
          updated.posted_by = 'user-1';
          
          for (const line of doc.lines) {
            const lot = await db.lots.findById(line.lot_id || '');
            if (lot) {
              lot.qty_available += line.received_qty;
              await db.lots.save(lot);
            } else if (line.lot) {
              // Create new lot if it doesn't exist
              await db.lots.save({
                id: line.lot.id,
                item_id: line.item_id,
                warehouse_id: doc.warehouse_id,
                lot_number: line.lot.lot_number,
                expiry_date: line.lot.expiry_date,
                qty_available: line.received_qty,
                is_active: true,
                created_at: new Date().toISOString()
              } as any);
            }
          }
        }
        
        return db.grn.save(updated);
      }
    }
  }

  if (normalizedPath === '/currencies/fx-rates') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.fxRates.findAll());
  }

  // --- Kitchen Requests Routes ---
  if (normalizedPath === '/operations/kitchen-requests') {
    if (method === 'GET') return MockFactory.wrapPagination(await db.kitchenRequests.findAll());
    if (method === 'POST') return db.kitchenRequests.save(MockFactory.createKitchenRequest(body));
  }
  if (normalizedPath.startsWith('/operations/kitchen-requests/')) {
    const parts = normalizedPath.split('/');
    const id = parts[3];
    const doc = await db.kitchenRequests.findById(id);
    if (!doc) return undefined;

    if (method === 'GET') return doc;
    if (method === 'PUT') return db.kitchenRequests.save({ ...body, id });

    if (parts.length === 5) {
      const action = parts[4].toUpperCase();
      const nextStatus = getNextStatusV2('KITCHEN_REQUEST', doc.status, action as any);
      if (nextStatus) {
        return db.kitchenRequests.save({ ...doc, status: nextStatus as any });
      }
    }
  }

  // --- Default Fallback ---
  console.warn(`[MockApiAdapter] Route not handled: ${method} ${path}`);
  return undefined;
}




