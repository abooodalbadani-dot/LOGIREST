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
  'GET /operations/lots-available': [
    { id: 'lot-exp', item_id: 'item-1', warehouse_id: 'wh-1', lot_number: 'LOT-EXP-001', expiry_date: '2023-01-01', qty_available: 100, is_expired: true, is_near_expiry: false },
    { id: 'lot-near', item_id: 'item-1', warehouse_id: 'wh-1', lot_number: 'LOT-NEAR-001', expiry_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], qty_available: 50, is_expired: false, is_near_expiry: true },
    { id: 'lot-valid1', item_id: 'item-1', warehouse_id: 'wh-1', lot_number: 'LOT-VAL-001', expiry_date: '2027-06-30', qty_available: 200, is_expired: false, is_near_expiry: false },
    { id: 'lot-valid2', item_id: 'item-1', warehouse_id: 'wh-1', lot_number: 'LOT-VAL-002', expiry_date: '2028-12-31', qty_available: 300, is_expired: false, is_near_expiry: false }
  ],

  // ─── Warehouse Lock States ─────────────────────────────────────────────
  'GET /inventory/warehouses/wh-1/lock': { is_locked: false, session_id: null, session_number: null, lock_started_at: null },
  'GET /inventory/warehouses/wh-2/lock': { is_locked: true, session_id: 'st-1', session_number: 'ST-2026-001', lock_started_at: '2026-04-20T08:00:00Z' },

  // ─── Items by barcode ──────────────────────────────────────────────────
  'GET /master-data/items': {
    data: [
      { id: 'item-1', code: 'ITM-001', barcode: '000001', name_ar: 'لحم بقر', name_en: 'Beef', category_id: 'cat-1', primary_uom: { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram' }, track_lots: true, min_stock_level: 10, reorder_point: 20, is_active: true, uom_conversions: [] }
    ],
    meta: { page: 1, page_size: 10, total: 1, total_pages: 1 }
  },

  // ─── Stocktake Sessions ────────────────────────────────────────────────
  'GET /stocktake/sessions': {
    data: [
      { id: 'st-1', session_number: 'ST-2026-001', warehouse_id: 'wh-2', status: 'OPEN', snapshot_at: '2026-04-20T08:00:00Z', started_by: 'user-1', posted_at: null, posted_by: null },
      { id: 'st-2', session_number: 'ST-2026-000', warehouse_id: 'wh-1', status: 'POSTED', snapshot_at: '2026-04-10T09:00:00Z', started_by: 'user-2', posted_at: '2026-04-10T17:00:00Z', posted_by: 'user-2' }
    ],
    meta: { page: 1, page_size: 10, total: 2, total_pages: 1 }
  },
  'GET /stocktake/sessions/st-1': {
    id: 'st-1',
    session_number: 'ST-2026-001',
    warehouse_id: 'wh-2',
    status: 'OPEN',
    snapshot_at: '2026-04-20T08:00:00Z',
    started_by: 'user-1',
    posted_at: null,
    posted_by: null,
    counts: [
      { id: 'cnt-1', session_id: 'st-1', item_id: 'item-1', item: { id: 'item-1', code: 'ITM-001', name_ar: 'لحم بقر', name_en: 'Beef' }, lot_id: 'lot-valid1', snapshot_qty: 150, counted_qty: null, variance: null, variance_reason: null },
      { id: 'cnt-2', session_id: 'st-1', item_id: 'item-2', item: { id: 'item-2', code: 'ITM-002', name_ar: 'دجاج', name_en: 'Chicken' }, lot_id: null, snapshot_qty: 80, counted_qty: null, variance: null, variance_reason: null },
      { id: 'cnt-3', session_id: 'st-1', item_id: 'item-3', item: { id: 'item-3', code: 'ITM-003', name_ar: 'زيت', name_en: 'Oil' }, lot_id: null, snapshot_qty: 40, counted_qty: null, variance: null, variance_reason: null },
      { id: 'cnt-4', session_id: 'st-1', item_id: 'item-4', item: { id: 'item-4', code: 'ITM-004', name_ar: 'ملح', name_en: 'Salt' }, lot_id: null, snapshot_qty: 200, counted_qty: null, variance: null, variance_reason: null }
    ]
  },
  'POST /stocktake/sessions': {
    id: 'st-new',
    session_number: 'ST-2026-002',
    warehouse_id: 'wh-1',
    status: 'OPEN',
    snapshot_at: new Date().toISOString(),
    started_by: 'user-1',
    posted_at: null,
    posted_by: null,
    counts: []
  },
  'PUT /stocktake/sessions/st-1/counts/cnt-1': {
    id: 'cnt-1', session_id: 'st-1', item_id: 'item-1',
    item: { id: 'item-1', code: 'ITM-001', name_ar: 'لحم بقر', name_en: 'Beef' },
    lot_id: 'lot-valid1', snapshot_qty: 150, counted_qty: 147, variance: -3, variance_reason: null
  },
  'POST /stocktake/sessions/st-1/post': {
    id: 'st-1',
    session_number: 'ST-2026-001',
    warehouse_id: 'wh-2',
    status: 'POSTED',
    snapshot_at: '2026-04-20T08:00:00Z',
    started_by: 'user-1',
    posted_at: new Date().toISOString(),
    posted_by: 'user-1',
    counts: []
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
  'POST /operations/adjustments': {
    id: 'adj-new',
    document_number: 'ADJ-2026-NEW',
    status: 'DRAFT',
    warehouse_id: 'wh-1',
    reason: 'DAMAGE',
    approved_by: null,
    lines: []
  },
  'POST /operations/adjustments/adj-1/approve': {
    id: 'adj-1',
    document_number: 'ADJ-2026-001',
    status: 'APPROVED',
    approved_by: 'user-1'
  },
  'POST /operations/adjustments/adj-2/post': {
    id: 'adj-2',
    document_number: 'ADJ-2026-002',
    status: 'POSTED',
    posted_at: new Date().toISOString()
  },
  'POST /operations/adjustments/adj-1/post': {
    id: 'adj-1',
    document_number: 'ADJ-2026-001',
    status: 'POSTED',
    posted_at: new Date().toISOString()
  }
};

