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
              poNumber: 'PO-2026-001',
              prId: 'PR-1001',
              supplierId: 'SUP-01',
              supplierCurrency: 'USD',
              exchangeRate: 3.75,
              createdBy: 'Khalid Abdullah',
              expectedDate: '2026-04-25T00:00:00Z',
              status: 'APPROVED',
              supplierTotalAmount: 1000.00,
              baseTotalAmount: 3750.00,
              items: [
                { itemId: 'IT-1', itemName: 'Industrial Oven', quantity: 100, unitPrice: 10.00 },
              ],
              notes: 'First batch of equipment.',
              createdAt: '2026-04-18T10:00:00Z', 
              updatedAt: '2026-04-18T15:00:00Z' 
            },
            { 
              id: 'PO-1002', 
              poNumber: 'PO-2026-002',
              supplierId: 'SUP-02',
              supplierCurrency: 'SAR',
              exchangeRate: 1.0,
              createdBy: 'Fatima Ali',
              expectedDate: '2026-04-20T00:00:00Z',
              status: 'PENDING_APPROVAL',
              supplierTotalAmount: 350.00,
              baseTotalAmount: 350.00,
              items: [
                { itemId: 'IT-3', itemName: 'Fresh Tomatoes', quantity: 10, unitPrice: 35.00 },
              ],
              notes: 'Local fresh produce.',
              createdAt: '2026-04-19T08:30:00Z', 
              updatedAt: '2026-04-19T08:30:00Z' 
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
              poNumber: 'PO-2026-001',
              prId: 'PR-1001',
              supplierId: 'SUP-01',
              supplierCurrency: 'USD',
              exchangeRate: 3.75,
              createdBy: 'Khalid Abdullah',
              expectedDate: '2026-04-25T00:00:00Z',
              status: 'APPROVED',
              supplierTotalAmount: 1000.00,
              baseTotalAmount: 3750.00,
              items: [
                { itemId: 'IT-1', itemName: 'Industrial Oven', quantity: 100, unitPrice: 10.00 },
              ],
              notes: 'First batch of equipment.',
              createdAt: '2026-04-18T10:00:00Z', 
              updatedAt: '2026-04-18T15:00:00Z' 
            },
            { 
              id: 'PO-1002', 
              poNumber: 'PO-2026-002',
              supplierId: 'SUP-02',
              supplierCurrency: 'SAR',
              exchangeRate: 1.0,
              createdBy: 'Fatima Ali',
              expectedDate: '2026-04-20T00:00:00Z',
              status: 'PENDING_APPROVAL',
              supplierTotalAmount: 350.00,
              baseTotalAmount: 350.00,
              items: [
                { itemId: 'IT-3', itemName: 'Fresh Tomatoes', quantity: 10, unitPrice: 35.00 },
              ],
              notes: 'Local fresh produce.',
              createdAt: '2026-04-19T08:30:00Z', 
              updatedAt: '2026-04-19T08:30:00Z' 
            },
          ];
          
          const found = pos.find(p => p.id === id || p.poNumber === id);
          if (found) resolve(found);
          else reject(new Error("Not found"));
        }, 500);
      });
    }
  });
}
