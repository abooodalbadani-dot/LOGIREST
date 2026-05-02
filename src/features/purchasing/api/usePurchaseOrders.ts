import { useQuery } from '@tanstack/react-query';
import { PurchaseOrder } from '../types';

export function usePurchaseOrders() {
 return useQuery({
 queryKey: ['purchaseOrders'],
 queryFn: async () => {
 return new Promise<PurchaseOrder[]>((resolve) => {
 setTimeout(() => {
 resolve([
 { 
 id: 'PO-1001', 
 document_number: 'PO-2026-001',
 pr_id: 'PR-1001',
 supplier_id: 'SUP-01',
 currency_code: 'USD',
 exchange_rate: 3.75,
 created_by: 'Khalid Abdullah',
 expected_date: '2026-04-25T00:00:00Z',
 status: 'APPROVED',
 supplier_total_amount: 1000.00,
 base_total_amount: 3750.00,
 lines: [
 { 
 id: 'POL-1',
 item: {
 id: 'IT-1',
 code: 'ITM-001',
 name_ar: 'فرن صناعي',
 name_en: 'Industrial Oven',
 primary_uom: { id: 'UOM-1', code: 'PCS' }
 },
 quantity: 100, 
 unit_price: 10.00,
 uom_id: 'UOM-1'
 },
 ],
 notes: 'First batch of equipment.',
 created_at: '2026-04-18T10:00:00Z', 
 updated_at: '2026-04-18T15:00:00Z' 
 },
 { 
 id: 'PO-1002', 
 document_number: 'PO-2026-002',
 supplier_id: 'SUP-02',
 currency_code: 'SAR',
 exchange_rate: 1.0,
 created_by: 'Fatima Ali',
 expected_date: '2026-04-20T00:00:00Z',
 status: 'SUBMITTED',
 supplier_total_amount: 350.00,
 base_total_amount: 350.00,
 lines: [
 { 
 id: 'POL-2',
 item: {
 id: 'IT-3',
 code: 'ITM-003',
 name_ar: 'طماطم طازجة',
 name_en: 'Fresh Tomatoes',
 primary_uom: { id: 'UOM-2', code: 'KG' }
 },
 quantity: 10, 
 unit_price: 35.00,
 uom_id: 'UOM-2'
 },
 ],
 notes: 'Local fresh produce.',
 created_at: '2026-04-19T08:30:00Z', 
 updated_at: '2026-04-19T08:30:00Z' 
 },
 ]);
 }, 800);
 });
 }
 });
}

export function usePurchaseOrder(id: string) {
 return useQuery({
 queryKey: ['purchaseOrder', id],
 queryFn: async () => {
 return new Promise<PurchaseOrder>((resolve, reject) => {
 setTimeout(() => {
 const pos: PurchaseOrder[] = [
 { 
 id: 'PO-1001', 
 document_number: 'PO-2026-001',
 pr_id: 'PR-1001',
 supplier_id: 'SUP-01',
 currency_code: 'USD',
 exchange_rate: 3.75,
 created_by: 'Khalid Abdullah',
 expected_date: '2026-04-25T00:00:00Z',
 status: 'APPROVED',
 supplier_total_amount: 1000.00,
 base_total_amount: 3750.00,
 lines: [
 { 
 id: 'POL-1',
 item: {
 id: 'IT-1',
 code: 'ITM-001',
 name_ar: 'فرن صناعي',
 name_en: 'Industrial Oven',
 primary_uom: { id: 'UOM-1', code: 'PCS' }
 },
 quantity: 100, 
 unit_price: 10.00,
 uom_id: 'UOM-1'
 },
 ],
 notes: 'First batch of equipment.',
 created_at: '2026-04-18T10:00:00Z', 
 updated_at: '2026-04-18T15:00:00Z' 
 },
 { 
 id: 'PO-1002', 
 document_number: 'PO-2026-002',
 supplier_id: 'SUP-02',
 currency_code: 'SAR',
 exchange_rate: 1.0,
 created_by: 'Fatima Ali',
 expected_date: '2026-04-20T00:00:00Z',
 status: 'SUBMITTED',
 supplier_total_amount: 350.00,
 base_total_amount: 350.00,
 lines: [
 { 
 id: 'POL-2',
 item: {
 id: 'IT-3',
 code: 'ITM-003',
 name_ar: 'طماطم طازجة',
 name_en: 'Fresh Tomatoes',
 primary_uom: { id: 'UOM-2', code: 'KG' }
 },
 quantity: 10, 
 unit_price: 35.00,
 uom_id: 'UOM-2'
 },
 ],
 notes: 'Local fresh produce.',
 created_at: '2026-04-19T08:30:00Z', 
 updated_at: '2026-04-19T08:30:00Z' 
 },
 ];
 
 const found = pos.find(p => p.id === id || p.document_number === id);
 if (found) resolve(found);
 else reject(new Error("Not found"));
 }, 500);
 });
 }
 });
}
