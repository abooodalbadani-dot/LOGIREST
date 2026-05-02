export const purchasingMocks: Record<string, unknown> = {
 'GET /procurement/grns': {
 data: [
 { id: 'grn-1', document_number: 'GRN-2023-001', status: 'DRAFT', supplier_id: 'sup-1', currency_id: 'USD', warehouse_id: 'wh-1', created_at: '2023-10-01T10:00:00Z', posted_at: null },
 { id: 'grn-2', document_number: 'GRN-2023-002', status: 'POSTED', supplier_id: 'sup-2', currency_id: 'USD', warehouse_id: 'wh-1', created_at: '2023-10-02T10:00:00Z', posted_at: '2023-10-02T11:00:00Z' },
 { id: 'grn-3', document_number: 'GRN-2023-003', status: 'APPROVED', supplier_id: 'sup-1', currency_id: 'SAR', warehouse_id: 'wh-1', created_at: '2023-10-03T10:00:00Z', posted_at: null }
 ],
 meta: {
 pagination: {
 page: 1, pageSize: 10, total: 3, total_pages: 1
 }
 }
 },
 'GET /procurement/grns/grn-1': {
 data: {
 id: 'grn-1',
 document_number: 'GRN-2023-001',
 status: 'DRAFT',
 supplier_id: 'sup-1',
 po_id: 'po-1',
 po_number: 'PO-2023-010',
 currency_id: 'USD',
 warehouse_id: 'wh-1',
 fx_rate: null,
 notes: 'Initial mock draft GRN',
 lines: [
 {
 id: 'line-1',
 item: { id: 'item-1', code: 'ITM-001', name_ar: 'لحم بقر', name_en: 'Beef', primary_uom: { id: 'uom-kg', code: 'KG' } },
 lot: null,
 qty: 50,
 received_qty: 50,
 uom_id: 'uom-kg',
 unit_cost_foreign: 10,
 unit_cost_base: 37.5
 },
 {
 id: 'line-2',
 item: { id: 'item-2', code: 'ITM-002', name_ar: 'دجاج', name_en: 'Chicken', primary_uom: { id: 'uom-ctn', code: 'CTN' } },
 lot: { id: 'lot-1', lot_number: 'LOT-2023-X', expiry_date: '2024-12-31' },
 qty: 10,
 received_qty: 10,
 uom_id: 'uom-ctn',
 unit_cost_foreign: 20,
 unit_cost_base: 75
 }
 ]
 }
 },
 'GET /procurement/grns/grn-2': {
 data: {
 id: 'grn-2',
 document_number: 'GRN-2023-002',
 status: 'POSTED',
 supplier_id: 'sup-2',
 po_id: null,
 po_number: null,
 currency_id: 'USD',
 warehouse_id: 'wh-1',
 fx_rate: 3.75,
 fx_rate_captured_at: '2023-10-02T11:00:00Z',
 notes: 'Posted GRN example',
 lines: []
 }
 },
 'POST /procurement/grns': {
 data: {
 id: 'grn-new',
 document_number: 'GRN-NEW',
 status: 'DRAFT',
 supplier_id: 'sup-1',
 currency_id: 'USD',
 warehouse_id: 'wh-1',
 lines: []
 }
 },
 'POST /procurement/grns/grn-1/post': {
 data: {
 id: 'grn-1',
 document_number: 'GRN-2023-001',
 status: 'POSTED',
 fx_rate: 3.75
 }
 },
 'GET /inventory/warehouses/wh-1/lock': {
 data: { is_locked: false, session_id: null, session_number: null, lock_started_at: null }
 },
 'GET /inventory/warehouses/wh-2/lock': {
 data: { is_locked: true, session_id: 'sess-2', session_number: 'ST-2026-001', lock_started_at: '2026-04-20T10:00:00Z' }
 },
 'GET /procurement/purchase-requests': {
 data: [
 { id: 'pr-1', document_number: 'PR-2023-001', status: 'DRAFT', department_id: 'dept-1', warehouse_id: 'wh-1', expected_date: '2023-11-01', created_at: '2023-10-01T10:00:00Z', created_by: 'Ahmed Ali' },
 { id: 'pr-2', document_number: 'PR-2023-002', status: 'APPROVED', department_id: 'dept-2', warehouse_id: 'wh-2', expected_date: '2023-11-05', created_at: '2023-10-02T10:00:00Z', created_by: 'Sarah J.' }
 ],
 meta: {
 pagination: {
 page: 1, pageSize: 10, total: 2, total_pages: 1
 }
 }
 },
 'GET /procurement/purchase-requests/pr-1': {
 data: {
 id: 'pr-1',
 document_number: 'PR-2023-001',
 status: 'DRAFT',
 department_id: 'dept-1',
 expected_date: '2023-11-01',
 notes: 'Please expedite',
 lines: [
 {
 id: 'pr-line-1',
 item: { id: 'item-1', code: 'ITM-001', name_ar: 'لحم بقر', name_en: 'Beef', primary_uom: { id: 'uom-kg', code: 'KG' } },
 req_qty: 20,
 uom_id: 'uom-kg'
 }
 ]
 }
 },
 'POST /procurement/purchase-requests': {
 data: {
 id: 'pr-new',
 document_number: 'PR-NEW',
 status: 'DRAFT',
 department_id: 'dept-1',
 lines: []
 }
 },
 'POST /procurement/purchase-requests/pr-1/submit': {
 data: {
 id: 'pr-1',
 document_number: 'PR-2023-001',
 status: 'SUBMITTED'
 }
 },
 'POST /procurement/purchase-requests/pr-1/approve': {
 data: {
 id: 'pr-1',
 document_number: 'PR-2023-001',
 status: 'APPROVED'
 }
 },
 'POST /procurement/purchase-requests/pr-1/reject': {
 data: {
 id: 'pr-1',
 document_number: 'PR-2023-001',
 status: 'REJECTED'
 }
 },
 'GET /procurement/purchase-orders': {
 data: [
 { id: 'po-1', document_number: 'PO-2023-010', status: 'DRAFT', supplier_id: 'sup-1', currency_id: 'USD', expected_delivery_date: '2023-11-10', total: 500, created_at: '2023-10-05T10:00:00Z' },
 { id: 'po-2', document_number: 'PO-2023-011', status: 'POSTED', supplier_id: 'sup-2', currency_id: 'USD', expected_delivery_date: '2023-11-15', total: 1000, created_at: '2023-10-06T10:00:00Z' }
 ],
 meta: {
 pagination: {
 page: 1, pageSize: 10, total: 2, total_pages: 1
 }
 }
 },
 'GET /procurement/purchase-orders/po-1': {
 data: {
 id: 'po-1',
 document_number: 'PO-2023-010',
 status: 'DRAFT',
 supplier_id: 'sup-1',
 target_warehouse_id: 'wh-1',
 currency_id: 'USD',
 notes: 'Standard PO',
 lines: [
 {
 id: 'po-line-1',
 item: { id: 'item-1', code: 'ITM-001', name_ar: 'لحم بقر', name_en: 'Beef', primary_uom: { id: 'uom-kg', code: 'KG' } },
 qty: 50,
 uom_id: 'uom-kg',
 unit_cost_foreign: 10
 }
 ]
 }
 },
 'POST /procurement/purchase-orders': {
 data: {
 id: 'po-new',
 document_number: 'PO-NEW',
 status: 'DRAFT',
 supplier_id: 'sup-1',
 lines: []
 }
 },
 'POST /procurement/purchase-orders/po-1/post': {
 data: {
 id: 'po-1',
 document_number: 'PO-2023-010',
 status: 'POSTED'
 }
 },
 'GET /currencies': {
 data: [
 { id: 'SAR', code: 'SAR', is_base: true, name: 'Saudi Riyal' },
 { id: 'USD', code: 'USD', is_base: false, name: 'US Dollar' }
 ]
 },
 'GET /currencies/fx-rates': {
 data: [
 { from_currency_id: 'USD', to_currency_id: 'SAR', rate: 3.75, effective_date: '2026-04-19' }
 ]
 },
 'GET /suppliers': {
 data: [
 { id: 'sup-1', name_ar: 'شركة التوريد', name_en: 'Supply Co', currency_id: 'USD' },
 { id: 'sup-2', name_ar: 'المورد المحلي', name_en: 'Local Supplier', currency_id: 'SAR' }
 ],
 meta: {
 pagination: {
 page: 1, pageSize: 10, total: 2, total_pages: 1
 }
 }
 }
};
