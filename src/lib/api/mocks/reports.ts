export const reportsMocks = {
  'GET /reports/available-inventory': [
    { sku: 'ITM-001', name: 'Beef (Frozen)', category: 'Proteins', qty_physical: 150, qty_reserved: 20, qty_available: 130 },
    { sku: 'ITM-002', name: 'Chicken (Fresh)', category: 'Proteins', qty_physical: 80, qty_reserved: 10, qty_available: 70 },
    { sku: 'ITM-005', name: 'Cooking Oil', category: 'Pantry', qty_physical: 45, qty_reserved: 5, qty_available: 40 },
    { sku: 'ITM-008', name: 'Tomato Paste', category: 'Canned', qty_physical: 120, qty_reserved: 0, qty_available: 120 },
  ],
  'GET /reports/movements': [
    { date: '2026-04-25 10:30', reference: 'GRN-2026-001', type: 'IN (GRN)', from: 'Supplier', to: 'Main WH', item: 'Beef (Frozen)', qty: 100, user: 'Admin' },
    { date: '2026-04-25 14:15', reference: 'ISS-2026-012', type: 'OUT (Issue)', from: 'Main WH', to: 'Kitchen', item: 'Beef (Frozen)', qty: 20, user: 'Chef Hassan' },
    { date: '2026-04-26 09:00', reference: 'TRN-2026-005', type: 'TRFR (Transfer)', from: 'Main WH', to: 'Branch A', item: 'Chicken (Fresh)', qty: 30, user: 'Sarah' },
  ],
  'GET /reports/expiry': [
    { sku: 'ITM-001', name: 'Beef', lot_no: 'LOT-2026-A', expiry_date: '2026-05-15', days_remaining: 25, status: 'Near Expiry' },
    { sku: 'ITM-002', name: 'Chicken', lot_no: 'LOT-2025-Z', expiry_date: '2026-03-01', days_remaining: -51, status: 'Expired' },
    { sku: 'ITM-009', name: 'Milk (Fresh)', lot_no: 'LOT-M-001', expiry_date: '2026-04-30', days_remaining: 5, status: 'Critical' },
  ],
  'GET /reports/stocktake-variance': [
    { sku: 'ITM-001', name: 'Beef', system_qty: 150, counted_qty: 147, variance: -3, reason: 'Freezer loss' },
    { sku: 'ITM-002', name: 'Chicken', system_qty: 80, counted_qty: 80, variance: 0, reason: 'Match' },
    { sku: 'ITM-005', name: 'Cooking Oil', system_qty: 45, counted_qty: 42, variance: -3, reason: 'Leakage' },
  ],
  'GET /reports/procurement-status': [
    { po_no: 'PO-2026-010', date: '2026-04-05', supplier: 'Supply Co', currency: 'USD', total: 500, status: 'DRAFT' },
    { po_no: 'PO-2026-011', date: '2026-04-06', supplier: 'Local Supplier', currency: 'SAR', total: 1000, status: 'POSTED' },
    { po_no: 'PO-2026-012', date: '2026-04-10', supplier: 'Veggie Hub', currency: 'EGP', total: 5000, status: 'RECEIVED' },
  ],
  'GET /reports/currency-summaries': [
    { currency: 'USD', total: 1500.50, total_base: 1500.50, last_rate: 1.000000 },
    { currency: 'SAR', total: 11250.00, total_base: 3000.00, last_rate: 3.750000 },
    { currency: 'EGP', total: 96000.00, total_base: 2000.00, last_rate: 48.000000 },
  ],
};
