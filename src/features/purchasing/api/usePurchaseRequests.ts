import { useQuery } from '@tanstack/react-query';
import { PurchaseRequest } from '../types';
import { PR_STATUS } from '@/contracts/statuses';


export function usePurchaseRequests() {
 return useQuery({
 queryKey: ['purchaseRequests'],
 queryFn: async () => {
 // Mock data returned for front-end iteration.
 return new Promise<PurchaseRequest[]>((resolve) => {
 setTimeout(() => {
 resolve([
 { 
 id: 'PR-1001', 
 document_number: 'PR-2026-001',
 department_id: '1', // Riyadh Main Branch
 expected_date: '2026-04-25T00:00:00Z',
          status: PR_STATUS.SUBMITTED,
 lines: [
 { 
 id: 'L1',
 item: { 
 id: 'IT-1', 
 code: 'OVEN-01', 
 name_ar: 'فرن صناعي', 
 name_en: 'Industrial Oven',
 primary_uom: { id: 'U1', code: 'PCS' }
 }, 
 req_qty: 100,
 uom_id: 'PCS'
 },
 ],
 notes: 'Monthly staples replenishment.',
 created_at: '2026-04-18T09:00:00Z', 
 },
 { 
 id: 'PR-1002', 
 document_number: 'PR-2026-002',
 department_id: '2', // Jeddah Branch
 expected_date: '2026-04-20T00:00:00Z',
          status: PR_STATUS.APPROVED,
 lines: [
 { 
 id: 'L2',
 item: { 
 id: 'IT-3', 
 code: 'TOM-01', 
 name_ar: 'طماطم طازجة', 
 name_en: 'Fresh Tomatoes',
 primary_uom: { id: 'U1', code: 'PCS' }
 }, 
 req_qty: 10,
 uom_id: 'PCS'
 },
 ],
 notes: 'Urgent cleaning supplies.',
 created_at: '2026-04-17T11:30:00Z', 
 },
 ]);
 }, 800);
 });
 }
 });
}

export function usePurchaseRequest(id: string) {
 return useQuery({
 queryKey: ['purchaseRequest', id],
 queryFn: async () => {
 return new Promise<PurchaseRequest>((resolve, reject) => {
 setTimeout(() => {
 const prs: PurchaseRequest[] = [
 { 
 id: 'PR-1001', 
 document_number: 'PR-2026-001',
 department_id: '1',
 expected_date: '2026-04-25T00:00:00Z',
          status: PR_STATUS.SUBMITTED,
 lines: [
 { 
 id: 'L1',
 item: { 
 id: 'IT-1', 
 code: 'OVEN-01', 
 name_ar: 'فرن صناعي', 
 name_en: 'Industrial Oven',
 primary_uom: { id: 'U1', code: 'PCS' }
 }, 
 req_qty: 100,
 uom_id: 'PCS'
 },
 ],
 notes: 'Monthly staples replenishment.',
 created_at: '2026-04-18T09:00:00Z', 
 },
 { 
 id: 'PR-1002', 
 document_number: 'PR-2026-002',
 department_id: '2',
 expected_date: '2026-04-20T00:00:00Z',
          status: PR_STATUS.APPROVED,
 lines: [
 { 
 id: 'L2',
 item: { 
 id: 'IT-3', 
 code: 'TOM-01', 
 name_ar: 'طماطم طازجة', 
 name_en: 'Fresh Tomatoes',
 primary_uom: { id: 'U1', code: 'PCS' }
 }, 
 req_qty: 10,
 uom_id: 'PCS'
 },
 ],
 notes: 'Urgent cleaning supplies.',
 created_at: '2026-04-17T11:30:00Z', 
 },
 ];
 
 const found = prs.find(p => p.id === id || p.document_number === id);
 if (found) resolve(found);
 else reject(new Error("Not found"));
 }, 500);
 });
 }
 });
}
