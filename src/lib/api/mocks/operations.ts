import { getNextStatusV2, canPerformActionV2 } from '@/core/workflow/document-engine';

// --- Internal Helper for Inventory Source ---
const mockInventorySource = [
  // wh-1: Riyadh Central Warehouse
  { itemId: 'item-1', warehouseId: 'wh-1', qtyOnHand: 150, unitCost: 45.0, itemNameEn: 'Beef', itemNameAr: 'لحم بقر', uom: 'KG', barcode: '6900001' },
  { itemId: 'item-2', warehouseId: 'wh-1', qtyOnHand: 30, unitCost: 18.0, itemNameEn: 'Chicken', itemNameAr: 'دجاج', uom: 'CTN', barcode: '6900002' },
  { itemId: 'item-3', warehouseId: 'wh-1', qtyOnHand: 200, unitCost: 12.5, itemNameEn: 'Oil', itemNameAr: 'زيت', uom: 'L', barcode: '6900003' },
  // wh-2: Jeddah Transit Point
  { itemId: 'item-1', warehouseId: 'wh-2', qtyOnHand: 80, unitCost: 45.0, itemNameEn: 'Beef', itemNameAr: 'لحم بقر', uom: 'KG', barcode: '6900001' },
  { itemId: 'item-4', warehouseId: 'wh-2', qtyOnHand: 45, unitCost: 22.0, itemNameEn: 'Rice', itemNameAr: 'أرز', uom: 'KG', barcode: '6900004' },
  // wh-3: Dammam Virtual Stock
  { itemId: 'item-3', warehouseId: 'wh-3', qtyOnHand: 60, unitCost: 12.5, itemNameEn: 'Oil', itemNameAr: 'زيت', uom: 'L', barcode: '6900003' },
  { itemId: 'item-4', warehouseId: 'wh-3', qtyOnHand: 120, unitCost: 22.0, itemNameEn: 'Rice', itemNameAr: 'أرز', uom: 'KG', barcode: '6900004' },
  { itemId: 'item-5', warehouseId: 'wh-3', qtyOnHand: 25, unitCost: 35.0, itemNameEn: 'Sugar', itemNameAr: 'سكر', uom: 'KG', barcode: '6900005' },
];

// Stateful mock database with persistence
const STORAGE_KEY = 'logirest_mock_stocktake_sessions';

const initialSessions = [
  { 
    id: 'stk-001', 
    sessionNumber: 'ST-2026-001', 
    sessionName: 'Monthly Kitchen Audit',
    warehouseId: 'wh-2', 
    status: 'DRAFT', 
    snapshotAt: '2026-04-20T08:00:00Z', 
    createdAt: '2026-04-20T08:00:00Z',
    updatedAt: '2026-04-20T08:00:00Z',
    startedBy: 'user-1', 
    postedAt: null, 
    postedBy: null,
    version: 1,
    items: [
      { id: 'cnt-1', itemId: 'item-1', itemName: 'Beef', uom: 'KG', snapshotQty: 150, countedQty: null, variance: null, varianceReason: null, unitCost: 45.0 },
      { id: 'cnt-2', itemId: 'item-2', itemName: 'Chicken', uom: 'CTN', snapshotQty: 80, countedQty: null, variance: null, varianceReason: null, unitCost: 18.0 }
    ]
  },
  { 
    id: 'stk-002', 
    sessionNumber: 'ST-2026-002', 
    sessionName: 'Yearly Warehouse Scan',
    warehouseId: 'wh-1', 
    status: 'POSTED', 
    snapshotAt: '2026-04-10T09:00:00Z', 
    createdAt: '2026-04-10T09:00:00Z',
    updatedAt: '2026-04-10T09:00:00Z',
    startedBy: 'user-2', 
    postedAt: '2026-04-10T17:00:00Z', 
    postedBy: 'user-2',
    version: 1,
    items: []
  }
];

let stocktakeSessions: any[] = [];

// Load from localStorage if available
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      stocktakeSessions = JSON.parse(saved);
    } catch (e) {
      stocktakeSessions = [...initialSessions];
    }
  } else {
    stocktakeSessions = [...initialSessions];
  }
} else {
  stocktakeSessions = [...initialSessions];
}

const persistSessions = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stocktakeSessions));
  }
};


export const operationsMocks: Record<string, unknown> = {
  // ─── Issues ───────────────────────────────────────────────────────────
  'GET /operations/issues': {
    data: [
      { id: 'iss-1', document_number: 'ISS-2026-001', type: 'ISSUE', status: 'DRAFT', destination_dept_id: 'dep-1', requested_by: 'Ahmed Al-Mansour', warehouse_id: 'wh-1', branch_id: 'br-1', notes: null, created_by: 'user-1', created_at: '2026-04-18T10:00:00Z', posted_at: null, posted_by: null },
      { id: 'iss-2', document_number: 'ISS-2026-002', type: 'ISSUE', status: 'POSTED', destination_dept_id: 'dep-2', requested_by: 'Sara Hassan', warehouse_id: 'wh-1', branch_id: 'br-1', notes: null, created_by: 'user-2', created_at: '2026-04-17T10:00:00Z', posted_at: '2026-04-17T11:00:00Z', posted_by: 'user-2' },
      { id: 'iss-3', document_number: 'ISS-2026-003', type: 'ISSUE', status: 'DRAFT', destination_dept_id: 'dep-1', requested_by: 'Khalid Nasser', warehouse_id: 'wh-1', branch_id: 'br-1', notes: 'Urgent', created_by: 'user-1', created_at: '2026-04-19T09:00:00Z', posted_at: null, posted_by: null }
    ],
    meta: { page: 1, page_size: 10, total: 3, total_pages: 1 }
  },
  'GET /operations/issues/iss-1': {
    id: 'iss-1',
    document_number: 'ISS-2026-001',
    type: 'ISSUE',
    status: 'DRAFT',
    destination_dept_id: 'dep-1',
    requested_by: 'Ahmed Al-Mansour',
    warehouse_id: 'wh-1',
    branch_id: 'br-1',
    notes: 'Weekly kitchen supply',
    created_by: 'user-1',
    created_at: '2026-04-18T10:00:00Z',
    posted_at: null,
    posted_by: null,
    lines: [
      {
        id: 'line-1',
        document_id: 'iss-1',
        item_id: 'item-1',
        item: { id: 'item-1', code: 'ITM-001', name_ar: 'لحم بقر', name_en: 'Beef', primary_uom: { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram' } },
        lot_id: 'lot-valid1',
        lot: { id: 'lot-valid1', lot_number: 'LOT-VAL1', expiry_date: '2027-12-31', is_expired: false },
        qty: 10,
        uom_id: 'uom-kg',
        unit_cost: null,
        requested_qty: 10,
        issued_qty: 10,
        lot_allocations: [
          { lot_id: 'lot-valid1', lot_number: 'LOT-VAL1', expiry_date: '2027-12-31', allocated_qty: 10, override_reason: null }
        ]
      },
      {
        id: 'line-2',
        document_id: 'iss-1',
        item_id: 'item-2',
        item: { id: 'item-2', code: 'ITM-002', name_ar: 'دجاج', name_en: 'Chicken', primary_uom: { id: 'uom-ctn', code: 'CTN', name_ar: 'كرتون', name_en: 'Carton' } },
        lot_id: null,
        lot: null,
        qty: 5,
        uom_id: 'uom-ctn',
        unit_cost: null,
        requested_qty: 5,
        issued_qty: 0,
        lot_allocations: []
      }
    ]
  },
  'POST /operations/issues': {
    id: 'iss-new',
    document_number: 'ISS-2026-NEW',
    type: 'ISSUE',
    status: 'DRAFT',
    destination_dept_id: 'dep-1',
    requested_by: '',
    warehouse_id: 'wh-1',
    branch_id: 'br-1',
    notes: null,
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    posted_at: null,
    posted_by: null,
    lines: []
  },
  'POST /operations/issues/iss-1/post': {
    id: 'iss-1',
    document_number: 'ISS-2026-001',
    type: 'ISSUE',
    status: 'POSTED',
    destination_dept_id: 'dep-1',
    requested_by: 'Ahmed Al-Mansour',
    warehouse_id: 'wh-1',
    branch_id: 'br-1',
    notes: 'Weekly kitchen supply',
    created_by: 'user-1',
    created_at: '2026-04-18T10:00:00Z',
    posted_at: new Date().toISOString(),
    posted_by: 'user-1',
    lines: []
  },
  // ─── Transfers ───────────────────────────────────────────────────────────
  'GET /operations/transfers': {
    data: [
      { id: 'trf-1', document_number: 'TRF-2026-001', transfer_status: 'DRAFT', from_warehouse_id: 'wh-1', to_warehouse_id: 'wh-3', shipped_at: null, received_at: null, created_by: 'user-1', created_at: '2026-04-18T10:00:00Z' },
      { id: 'trf-2', document_number: 'TRF-2026-002', transfer_status: 'IN_TRANSIT', from_warehouse_id: 'wh-1', to_warehouse_id: 'wh-3', shipped_at: '2026-04-17T09:00:00Z', received_at: null, created_by: 'user-2', created_at: '2026-04-17T08:00:00Z' }
    ],
    meta: { page: 1, page_size: 10, total: 2, total_pages: 1 }
  },
  'GET /operations/transfers/trf-1': {
    id: 'trf-1',
    document_number: 'TRF-2026-001',
    transfer_status: 'DRAFT',
    from_warehouse_id: 'wh-1',
    to_warehouse_id: 'wh-3',
    notes: 'Restocking wh-3',
    shipped_at: null,
    received_at: null,
    created_by: 'user-1',
    created_at: '2026-04-18T10:00:00Z',
    lines: [
      {
        id: 'trf-line-1',
        document_id: 'trf-1',
        item_id: 'item-1',
        item: { id: 'item-1', code: 'ITM-001', name_ar: 'لحم بقر', name_en: 'Beef', primary_uom: { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram' } },
        qty: 20,
        shipped_qty: 20,
        received_qty: null,
        uom_id: 'uom-kg',
        lot_allocations: []
      },
      {
        id: 'trf-line-2',
        document_id: 'trf-1',
        item_id: 'item-2',
        item: { id: 'item-2', code: 'ITM-002', name_ar: 'دجاج', name_en: 'Chicken', primary_uom: { id: 'uom-ctn', code: 'CTN', name_ar: 'كرتون', name_en: 'Carton' } },
        qty: 5,
        shipped_qty: 5,
        received_qty: null,
        uom_id: 'uom-ctn',
        lot_allocations: []
      }
    ]
  },
  'GET /operations/transfers/trf-2': {
    id: 'trf-2',
    document_number: 'TRF-2026-002',
    transfer_status: 'IN_TRANSIT',
    from_warehouse_id: 'wh-1',
    to_warehouse_id: 'wh-3',
    notes: 'In transit',
    shipped_at: '2026-04-17T09:00:00Z',
    received_at: null,
    created_by: 'user-2',
    created_at: '2026-04-17T08:00:00Z',
    lines: [
      {
        id: 'trf2-line-1',
        document_id: 'trf-2',
        item_id: 'item-1',
        item: { id: 'item-1', code: 'ITM-001', name_ar: 'لحم بقر', name_en: 'Beef', primary_uom: { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram' } },
        qty: 10,
        shipped_qty: 10,
        received_qty: null,
        uom_id: 'uom-kg',
        lot_allocations: []
      }
    ]
  },
  'POST /operations/transfers': {
    id: 'trf-new',
    document_number: 'TRF-2026-NEW',
    transfer_status: 'DRAFT',
    from_warehouse_id: 'wh-1',
    to_warehouse_id: 'wh-3',
    lines: []
  },
  'POST /operations/transfers/trf-1/ship': {
    id: 'trf-1',
    document_number: 'TRF-2026-001',
    transfer_status: 'IN_TRANSIT',
    shipped_at: new Date().toISOString()
  },
  'POST /operations/transfers/trf-2/receive': {
    id: 'trf-2',
    document_number: 'TRF-2026-002',
    transfer_status: 'RECEIVED',
    received_at: new Date().toISOString()
  },
  'POST /operations/transfers/trf-1/post': {
    id: 'trf-1',
    document_number: 'TRF-2026-001',
    transfer_status: 'POSTED',
    status: 'POSTED',
    posted_at: new Date().toISOString()
  },

  // ─── Lots Available (for FEFO drawer) ─────────────────────────────────
  'GET /operations/lots-available': {
    data: [
      { id: 'lot-exp', item_id: 'item-1', warehouse_id: 'wh-1', lot_number: 'LOT-EXP-001', expiry_date: '2023-01-01', qty_available: 100, is_expired: true, is_near_expiry: false },
      { id: 'lot-near', item_id: 'item-1', warehouse_id: 'wh-1', lot_number: 'LOT-NEAR-001', expiry_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], qty_available: 50, is_expired: false, is_near_expiry: true },
      { id: 'lot-valid1', item_id: 'item-1', warehouse_id: 'wh-1', lot_number: 'LOT-VAL-001', expiry_date: '2027-06-30', qty_available: 200, is_expired: false, is_near_expiry: false },
      { id: 'lot-valid2', item_id: 'item-1', warehouse_id: 'wh-1', lot_number: 'LOT-VAL-002', expiry_date: '2028-12-31', qty_available: 300, is_expired: false, is_near_expiry: false }
    ]
  },

  // ─── Warehouse Lock States ─────────────────────────────────────────────
  'GET /inventory/warehouses/:id/lock': (_body: any, path: string) => {
    const warehouseId = path.split('/')[3];
    // Find any active stocktake for this warehouse
    const activeSession = stocktakeSessions.find(s => 
      s.warehouseId === warehouseId && 
      ['DRAFT', 'STARTED', 'COUNTING', 'VARIANCE_SUBMITTED', 'APPROVED', 'REJECTED'].includes(s.status)
    );

    return {
      isLocked: !!activeSession,
      sessionId: activeSession?.id || null,
      sessionNumber: activeSession?.sessionNumber || null,
      lockStartedAt: activeSession?.snapshotAt || null,
    };
  },

  // ─── Items by barcode ──────────────────────────────────────────────────
  'GET /master-data/items': {
    data: [
      { id: 'item-1', code: 'ITM-001', barcode: '000001', name_ar: 'لحم بقر', name_en: 'Beef', category_id: 'cat-1', primary_uom: { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram' }, track_lots: true, min_stock_level: 10, reorder_point: 20, is_active: true, uom_conversions: [] }
    ],
    meta: { page: 1, page_size: 10, total: 1, total_pages: 1 }
  },

  // ─── Stocktake Sessions ────────────────────────────────────────────────
  'GET /stocktake/sessions': () => ({
    data: stocktakeSessions.map(s => ({
      id: s.id,
      sessionNumber: s.sessionNumber,
      sessionName: s.sessionName || s.sessionNumber,
      warehouseId: s.warehouseId,
      status: s.status,
      snapshotAt: s.snapshotAt,
      startedBy: s.startedBy,
      postedAt: s.postedAt,
      postedBy: s.postedBy,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      version: s.version
    })),
    meta: { page: 1, page_size: 10, total: stocktakeSessions.length, total_pages: 1 }
  }),


  'GET /stocktake/sessions/:id': (_body: any, path: string) => {
    const id = path.split('/').pop();
    const session = stocktakeSessions.find(s => s.id === id);
    if (!session) return undefined;
    
    // Ledger-Grade Protection: Hide snapshotQty during COUNTING phase
    return {
      ...session,
      items: session.items.map((c: any) => ({
        ...c,
        snapshotQty: ['STARTED', 'COUNTING'].includes(session.status) ? null : c.snapshotQty
      }))
    };
  },

  'POST /stocktake/sessions': (body: any) => {
    // Ledger Engine Lock Check: Strict warehouse locking
    const existingActive = stocktakeSessions.find(s => 
      s.warehouseId === body.warehouseId && 
      !['POSTED', 'CANCELLED'].includes(s.status)
    );

    if (existingActive) {
      return {
        error: {
          code: 'WAREHOUSE_LOCKED',
          message: `Warehouse ${body.warehouseId} is locked by active session ${existingActive.sessionNumber} (${existingActive.status})`
        }
      };
    }

    // Snapshot Freeze: Capture current inventory levels
    const warehouseItems = mockInventorySource.filter(i => i.warehouseId === body.warehouseId);
    
    const newSession = {
      id: `stk-${Date.now()}`,
      sessionNumber: `ST-2026-${String(stocktakeSessions.length + 1).padStart(3, '0')}`,
      sessionName: body.sessionName || `Audit ${new Date().toLocaleDateString()}`,
      warehouseId: body.warehouseId || 'wh-1',
      status: 'DRAFT',
      snapshotAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedBy: 'user-1',
      postedAt: null,
      postedBy: null,
      version: 1, // Start at version 1
      items: warehouseItems.map((item, idx) => ({
        id: `cnt-${idx + 1}`,
        itemId: item.itemId,
        itemName: item.itemNameEn,
        barcode: item.barcode,
        uom: item.uom,
        snapshotQty: item.qtyOnHand, // Immutable Snapshot capture
        countedQty: null,
        variance: null,
        varianceReason: null,
        unitCost: item.unitCost
      }))
    };

    stocktakeSessions.push(newSession);
    persistSessions();
    return newSession;
  },

  'POST /stocktake/sessions/:id/:action': (body: any, path: string) => {
    const parts = path.split('/');
    const action = parts.pop()?.toUpperCase();
    const id = parts.pop();
    
    const index = stocktakeSessions.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    
    const session = stocktakeSessions[index];

    // Enforce Transitions using canPerformActionV2
    if (!canPerformActionV2('STOCKTAKE', session.status, action as any, 'ADMIN')) {
      return { 
        error: { 
          code: 'INVALID_TRANSITION', 
          message: `Cannot ${action} from ${session.status}` 
        } 
      };
    }

    const nextStatus = getNextStatusV2('STOCKTAKE', session.status, action as any);
    
    if (!nextStatus) {
      return { 
        error: { 
          code: 'UNKNOWN_NEXT_STATUS', 
          message: `No transition found for ${action} from ${session.status}` 
        } 
      };
    }

    // Ledger Engine: Calculate Variance during submission
    if (action === 'SUBMIT') {
      session.items.forEach((line: any) => {
        const counted = line.countedQty !== null ? line.countedQty : 0;
        line.variance = counted - line.snapshotQty;
        line.varianceValue = (line.variance || 0) * (line.unitCost || 0);
      });
    }

    // Ledger Engine: Update reasons during Review Variance
    if (action === 'REVIEW_VARIANCE') {
      if (body.items) {
        body.items.forEach((update: any) => {
          const line = session.items.find((l: any) => l.id === update.lineId);
          if (line) {
            line.varianceReason = update.varianceReason;
          }
        });
      }
    }

    // Inventory Manifestation: ONLY at POST transition
    if (action === 'POST') {
      session.items.forEach((line: any) => {
        const invItem = mockInventorySource.find(i => 
          i.itemId === line.itemId && i.warehouseId === session.warehouseId
        );
        if (invItem) {
          invItem.qtyOnHand = line.countedQty !== null ? line.countedQty : 0;
        }
      });
    }
    
    // Update session state
    const now = new Date().toISOString();
    stocktakeSessions[index] = {
      ...session,
      status: nextStatus,
      version: (session.version || 0) + 1, // Crucial: version increment
      updatedAt: now,
      postedAt: nextStatus === 'POSTED' ? now : session.postedAt,
      postedBy: nextStatus === 'POSTED' ? 'user-1' : session.postedBy,
      approverComment: body?.comment || session.approverComment,
      approvedBy: nextStatus === 'APPROVED' ? 'user-1' : session.approvedBy,
      approvedAt: nextStatus === 'APPROVED' ? now : session.approvedAt,
    };
    
    persistSessions();
    return stocktakeSessions[index];
  },


  'PUT /stocktake/sessions/:id/items/:lineId': (body: any, path: string) => {
    const parts = path.split('/');
    const lineId = parts.pop();
    const id = parts[parts.length - 2];
    
    const sessionIndex = stocktakeSessions.findIndex(s => s.id === id);
    if (sessionIndex === -1) return undefined;
    
    const session = stocktakeSessions[sessionIndex];
    
    // Ledger Guard: Items can only be updated during active counting phases
    if (!['STARTED', 'COUNTING'].includes(session.status)) {
      return {
        error: {
          code: 'SESSION_LOCKED',
          message: `Cannot update items when session is in ${session.status} status`
        }
      };
    }

    const lineIndex = session.items.findIndex((c: any) => c.id === lineId);
    if (lineIndex === -1) return undefined;
    
    const line = session.items[lineIndex];
    
    // Update line data
    session.items[lineIndex] = {
      ...line,
      countedQty: body.countedQty, 
      varianceReason: body.varianceReason
    };
    
    // Workflow logic: First count update triggers transition from STARTED to COUNTING
    if (session.status === 'STARTED') {
      session.status = 'COUNTING';
    }
    
    // Metadata updates
    session.version = (session.version || 1) + 1;
    session.updatedAt = new Date().toISOString();
    
    persistSessions();
    return session.items[lineIndex];
  },

  // ─── Adjustments ───────────────────────────────────────────────────────────
  'GET /operations/adjustments': {
    data: [
      { id: 'adj-1', document_number: 'ADJ-2026-001', status: 'DRAFT', warehouse_id: 'wh-1', reason: 'DAMAGE', approved_by: null, created_by: 'user-1', created_at: '2026-04-18T10:00:00Z', posted_at: null },
      { id: 'adj-2', document_number: 'ADJ-2026-002', status: 'APPROVED', warehouse_id: 'wh-1', reason: 'COUNTING_ERROR', approved_by: 'user-1', created_by: 'user-2', created_at: '2026-04-17T10:00:00Z', posted_at: null }
    ],
    meta: { page: 1, page_size: 10, total: 2, total_pages: 1 }
  },
  'GET /operations/adjustments/adj-1': {
    id: 'adj-1',
    document_number: 'ADJ-2026-001',
    status: 'DRAFT',
    warehouse_id: 'wh-1',
    reason: 'DAMAGE',
    notes: 'Found damaged frozen stock',
    approved_by: null,
    created_by: 'user-1',
    created_at: '2026-04-18T10:00:00Z',
    posted_at: null,
    lines: [
      {
        id: 'adj-line-1',
        document_id: 'adj-1',
        item_id: 'item-1',
        item: { id: 'item-1', code: 'ITM-001', name_ar: 'لحم بقر', name_en: 'Beef', primary_uom: { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram' } },
        direction: 'DECREASE',
        qty_before: 100,
        qty_adjusted: 5,
        uom_id: 'uom-kg',
        reason_notes: 'Freezer malfunction spoilage'
      }
    ]
  },
  'GET /operations/adjustments/adj-2': {
    id: 'adj-2',
    document_number: 'ADJ-2026-002',
    status: 'APPROVED',
    warehouse_id: 'wh-1',
    reason: 'COUNTING_ERROR',
    notes: 'Recount revealed discrepancy',
    approved_by: 'user-1',
    created_by: 'user-2',
    created_at: '2026-04-17T10:00:00Z',
    posted_at: null,
    lines: [
      {
        id: 'adj2-line-1',
        document_id: 'adj-2',
        item_id: 'item-2',
        item: { id: 'item-2', code: 'ITM-002', name_ar: 'دجاج', name_en: 'Chicken', primary_uom: { id: 'uom-ctn', code: 'CTN', name_ar: 'كرتون', name_en: 'Carton' } },
        direction: 'INCREASE',
        qty_before: 30,
        qty_adjusted: 3,
        uom_id: 'uom-ctn',
        reason_notes: 'Physical count was higher than system'
      }
    ]
  },
  'POST /operations/adjustments': (body: any) => {
    return { id: `adj-${Date.now()}`, document_number: 'ADJ-NEW', status: 'DRAFT', ...body };
  },
  'POST /operations/adjustments/:id/approve': {
    id: 'adj-1',
    document_number: 'ADJ-2026-001',
    status: 'APPROVED',
    approved_by: 'user-1'
  },
  'POST /operations/adjustments/:id/post': {
    id: 'adj-1',
    document_number: 'ADJ-2026-001',
    status: 'POSTED',
    posted_at: new Date().toISOString()
  },
  'POST /operations/adjustments/:id/submit': {
    id: 'adj-1',
    status: 'SUBMITTED'
  },
  'POST /operations/adjustments/:id/reject': {
    id: 'adj-1',
    status: 'REJECTED'
  },

  // ─── Kitchen Requests ──────────────────────────────────────────────────
  'GET /operations/kitchen-requests': {
    data: [
      { id: 'kr-1', request_number: 'REQ-2026-001', status: 'DRAFT', department_id: 'dep-1', warehouse_id: 'wh-1', requested_by: 'Ali Hassan', requested_at: '2026-04-25T08:00:00Z', created_at: '2026-04-25T08:00:00Z' },
      { id: 'kr-2', request_number: 'REQ-2026-002', status: 'SUBMITTED', department_id: 'dep-2', warehouse_id: 'wh-1', requested_by: 'Sara Ahmed', requested_at: '2026-04-26T10:00:00Z', created_at: '2026-04-26T10:00:00Z' },
      { id: 'kr-3', request_number: 'REQ-2026-003', status: 'APPROVED', department_id: 'dep-1', warehouse_id: 'wh-1', requested_by: 'Mona Ali', requested_at: '2026-04-27T11:00:00Z', created_at: '2026-04-27T11:00:00Z' }
    ],
    meta: { page: 1, page_size: 10, total: 3, total_pages: 1 }
  },
  'GET /operations/kitchen-requests/kr-1': {
    id: 'kr-1',
    request_number: 'REQ-2026-001',
    status: 'DRAFT',
    department_id: 'dep-1',
    warehouse_id: 'wh-1',
    notes: 'Urgent request for breakfast items',
    requested_by: 'Ali Hassan',
    requested_at: '2026-04-25T08:00:00Z',
    created_at: '2026-04-25T08:00:00Z',
    items: [
      { id: 'kri-1', item_id: 'item-1', item_name: 'Beef', uom: 'KG', quantity: 5, notes: 'Minced beef' },
      { id: 'kri-2', item_id: 'item-2', item_name: 'Chicken', uom: 'CTN', quantity: 2 }
    ]
  },
  'GET /operations/kitchen-requests/kr-2': {
    id: 'kr-2',
    request_number: 'REQ-2026-002',
    status: 'SUBMITTED',
    department_id: 'dep-2',
    warehouse_id: 'wh-1',
    notes: 'Weekly supply',
    requested_by: 'Sara Ahmed',
    requested_at: '2026-04-26T10:00:00Z',
    created_at: '2026-04-26T10:00:00Z',
    items: [
      { id: 'kri-3', item_id: 'item-1', item_name: 'Beef', uom: 'KG', quantity: 10 }
    ]
  },
  'GET /operations/kitchen-requests/kr-3': {
    id: 'kr-3',
    request_number: 'REQ-2026-003',
    status: 'APPROVED',
    department_id: 'dep-1',
    warehouse_id: 'wh-1',
    notes: 'Pre-approved monthly stock',
    requested_by: 'Mona Ali',
    requested_at: '2026-04-27T11:00:00Z',
    created_at: '2026-04-27T11:00:00Z',
    items: [
      { id: 'kri-4', item_id: 'item-2', item_name: 'Chicken', uom: 'CTN', quantity: 15 }
    ]
  },
  'POST /operations/kitchen-requests': {
    id: 'kr-new',
    request_number: 'REQ-2026-NEW',
    status: 'DRAFT',
    department_id: 'dep-1',
    warehouse_id: 'wh-1',
    items: []
  }
};

