export const inventoryMocks: Record<string, unknown> = {
  'GET /inventory/balance': {
    data: [
      { item_id: 'item-1', item_code: 'ITM-001', item_name_ar: 'لحم بقر', item_name_en: 'Beef', warehouse_id: 'wh-1', warehouse_name_ar: 'المستودع الرئيسي', warehouse_name_en: 'Main Warehouse', qty_on_hand: 150, qty_reserved: 20, qty_available: 130, reorder_point: 100 },
      { item_id: 'item-2', item_code: 'ITM-002', item_name_ar: 'دجاج', item_name_en: 'Chicken', warehouse_id: 'wh-1', warehouse_name_ar: 'المستودع الرئيسي', warehouse_name_en: 'Main Warehouse', qty_on_hand: 30, qty_reserved: 15, qty_available: 15, reorder_point: 50 },
      { item_id: 'item-1', item_code: 'ITM-001', item_name_ar: 'لحم بقر', item_name_en: 'Beef', warehouse_id: 'wh-2', warehouse_name_ar: 'مستودع التبريد', warehouse_name_en: 'Cold Storage', qty_on_hand: 80, qty_reserved: 10, qty_available: 70, reorder_point: 100 },
      { item_id: 'item-2', item_code: 'ITM-002', item_name_ar: 'دجاج', item_name_en: 'Chicken', warehouse_id: 'wh-3', warehouse_name_ar: 'المستودع الجاف', warehouse_name_en: 'Dry Storage', qty_on_hand: 10, qty_reserved: 5, qty_available: 5, reorder_point: 50 },
      { item_id: 'item-3', item_code: 'ITM-003', item_name_ar: 'زيت', item_name_en: 'Oil', warehouse_id: 'wh-1', warehouse_name_ar: 'المستودع الرئيسي', warehouse_name_en: 'Main Warehouse', qty_on_hand: 200, qty_reserved: 30, qty_available: 170, reorder_point: 60 }
    ],
    meta: { page: 1, page_size: 10, total: 5, total_pages: 1 }
  },

  'GET /inventory/lots': {
    data: [
      { id: 'lot-1', item_id: 'item-1', item_code: 'ITM-001', item_name_ar: 'لحم بقر', item_name_en: 'Beef', lot_number: 'LOT-2025-A1', expiry_date: '2024-06-30', qty_available: 40, is_expired: true, is_near_expiry: false },
      { id: 'lot-2', item_id: 'item-1', item_code: 'ITM-001', item_name_ar: 'لحم بقر', item_name_en: 'Beef', lot_number: 'LOT-2025-A2', expiry_date: '2024-12-15', qty_available: 25, is_expired: true, is_near_expiry: false },
      { id: 'lot-3', item_id: 'item-2', item_code: 'ITM-002', item_name_ar: 'دجاج', item_name_en: 'Chicken', lot_number: 'LOT-2026-B1', expiry_date: '2026-05-15', qty_available: 30, is_expired: false, is_near_expiry: true },
      { id: 'lot-4', item_id: 'item-1', item_code: 'ITM-001', item_name_ar: 'لحم بقر', item_name_en: 'Beef', lot_number: 'LOT-2026-C1', expiry_date: '2027-12-31', qty_available: 100, is_expired: false, is_near_expiry: false },
      { id: 'lot-5', item_id: 'item-2', item_code: 'ITM-002', item_name_ar: 'دجاج', item_name_en: 'Chicken', lot_number: 'LOT-2026-C2', expiry_date: '2028-06-30', qty_available: 50, is_expired: false, is_near_expiry: false },
      { id: 'lot-6', item_id: 'item-3', item_code: 'ITM-003', item_name_ar: 'زيت', item_name_en: 'Oil', lot_number: 'LOT-2026-D1', expiry_date: '2029-01-01', qty_available: 200, is_expired: false, is_near_expiry: false }
    ],
    meta: { page: 1, page_size: 10, total: 6, total_pages: 1 }
  },

  'GET /inventory/movements': {
    data: [
      { id: 'mv-1', posted_at: '2026-04-20T09:00:00Z', document_id: 'grn-1', document_number: 'GRN-2026-001', document_type: 'GRN', item_id: 'item-1', item_code: 'ITM-001', item_name_ar: 'لحم بقر', item_name_en: 'Beef', lot_number: 'LOT-2026-C1', direction: 'IN', qty: 100 },
      { id: 'mv-2', posted_at: '2026-04-20T09:00:00Z', document_id: 'grn-1', document_number: 'GRN-2026-001', document_type: 'GRN', item_id: 'item-2', item_code: 'ITM-002', item_name_ar: 'دجاج', item_name_en: 'Chicken', lot_number: 'LOT-2026-C2', direction: 'IN', qty: 50 },
      { id: 'mv-3', posted_at: '2026-04-19T11:00:00Z', document_id: 'iss-2', document_number: 'ISS-2026-002', document_type: 'ISSUE', item_id: 'item-1', item_code: 'ITM-001', item_name_ar: 'لحم بقر', item_name_en: 'Beef', lot_number: 'LOT-2026-C1', direction: 'OUT', qty: 20 },
      { id: 'mv-4', posted_at: '2026-04-19T11:00:00Z', document_id: 'iss-2', document_number: 'ISS-2026-002', document_type: 'ISSUE', item_id: 'item-2', item_code: 'ITM-002', item_name_ar: 'دجاج', item_name_en: 'Chicken', lot_number: 'LOT-2026-C2', direction: 'OUT', qty: 10 },
      { id: 'mv-5', posted_at: '2026-04-18T14:00:00Z', document_id: 'trf-1', document_number: 'TRF-2026-001', document_type: 'TRANSFER', item_id: 'item-1', item_code: 'ITM-001', item_name_ar: 'لحم بقر', item_name_en: 'Beef', lot_number: 'LOT-2025-A1', direction: 'OUT', qty: 30 },
      { id: 'mv-6', posted_at: '2026-04-18T14:00:00Z', document_id: 'trf-1', document_number: 'TRF-2026-001', document_type: 'TRANSFER', item_id: 'item-1', item_code: 'ITM-001', item_name_ar: 'لحم بقر', item_name_en: 'Beef', lot_number: 'LOT-2025-A1', direction: 'IN', qty: 30 },
      { id: 'mv-7', posted_at: '2026-04-17T10:00:00Z', document_id: 'grn-2', document_number: 'GRN-2026-002', document_type: 'GRN', item_id: 'item-3', item_code: 'ITM-003', item_name_ar: 'زيت', item_name_en: 'Oil', lot_number: 'LOT-2026-D1', direction: 'IN', qty: 200 },
      { id: 'mv-8', posted_at: '2026-04-16T15:00:00Z', document_id: 'iss-3', document_number: 'ISS-2026-003', document_type: 'ISSUE', item_id: 'item-2', item_code: 'ITM-002', item_name_ar: 'دجاج', item_name_en: 'Chicken', lot_number: null, direction: 'OUT', qty: 5 },
      { id: 'mv-9', posted_at: '2026-04-15T08:00:00Z', document_id: 'grn-3', document_number: 'GRN-2026-003', document_type: 'GRN', item_id: 'item-1', item_code: 'ITM-001', item_name_ar: 'لحم بقر', item_name_en: 'Beef', lot_number: 'LOT-2025-A2', direction: 'IN', qty: 25 },
      { id: 'mv-10', posted_at: '2026-04-14T12:00:00Z', document_id: 'adj-1', document_number: 'ADJ-2026-001', document_type: 'ISSUE', item_id: 'item-1', item_code: 'ITM-001', item_name_ar: 'لحم بقر', item_name_en: 'Beef', lot_number: 'LOT-2025-A1', direction: 'OUT', qty: 5 }
    ],
    meta: { page: 1, page_size: 10, total: 10, total_pages: 1 }
  }
};
