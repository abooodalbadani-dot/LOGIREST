export const reportsMocks = {
  'GET /reports/consumption': [
    { code: 'ITM-001', name: 'Beef (Frozen)', qty: 50, wh: 'Main Warehouse', date: '2026-04-20' },
    { code: 'ITM-002', name: 'Chicken (Fresh)', qty: 30, wh: 'Main Warehouse', date: '2026-04-20' },
    { code: 'ITM-005', name: 'Cooking Oil', qty: 10, wh: 'Kitchen Pantry', date: '2026-04-21' },
  ],
  'GET /reports/expiry': [
    { code: 'ITM-001', name: 'Beef', lot: 'LOT-2026-A', expiry: '2026-05-15', days: 25, status: 'Near Expiry' },
    { code: 'ITM-002', name: 'Chicken', lot: 'LOT-2025-Z', expiry: '2026-03-01', days: -51, status: 'Expired' },
  ],
  'GET /reports/procurement': [
    { id: 'PO-2026-010', supplier: 'Supply Co', currency: 'USD', total: 500, status: 'DRAFT', date: '2026-04-05' },
    { id: 'PO-2026-011', supplier: 'Local Supplier', currency: 'SAR', total: 1000, status: 'POSTED', date: '2026-04-06' },
  ],
  'GET /reports/variance': [
    { code: 'ITM-001', name: 'Beef', sys: 150, cnt: 147, var: -3, reason: 'Freezer malfunction' },
    { code: 'ITM-002', name: 'Chicken', sys: 80, cnt: 80, var: 0, reason: '' },
  ],
  'GET /reports/valuation': [
    { code: 'ITM-001', name: 'Beef', qty: 150, cost: 12.5, total: 1875 },
    { code: 'ITM-002', name: 'Chicken', qty: 80, cost: 8.0, total: 640 },
  ],
  'GET /reports/audit': [
    { date: '2026-04-22 10:30', user: 'Admin User', action: 'POST', entity: 'Adjustment', ref: 'ADJ-2026-001' },
    { date: '2026-04-22 09:15', user: 'Sarah Hassan', action: 'CREATE', entity: 'Issue', ref: 'ISS-2026-042' },
  ],
};
