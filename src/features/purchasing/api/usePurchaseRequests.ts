import { useQuery } from '@tanstack/react-query';
import { PurchaseRequest } from '../types';
import { apiClient } from '@/lib/api/client';

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
              prNumber: 'PR-2026-001',
              branchId: '1', // Riyadh Main Branch
              requestedBy: 'Khalid Abdullah',
              expectedDate: '2026-04-25T00:00:00Z',
              status: 'PENDING_APPROVAL',
              totalAmount: 14500.00,
              items: [
                { itemId: 'IT-1', quantity: 100, estimatedUnitCost: 45.50 },
                { itemId: 'IT-2', quantity: 5, estimatedUnitCost: 1250.00 },
              ],
              notes: 'Monthly staples replenishment.',
              createdAt: '2026-04-18T09:00:00Z', 
              updatedAt: '2026-04-18T09:00:00Z' 
            },
            { 
              id: 'PR-1002', 
              prNumber: 'PR-2026-002',
              branchId: '2', // Jeddah Branch
              requestedBy: 'Fatima Ali',
              expectedDate: '2026-04-20T00:00:00Z',
              status: 'APPROVED',
              totalAmount: 350.00,
              items: [
                { itemId: 'IT-3', quantity: 10, estimatedUnitCost: 35.00 },
              ],
              notes: 'Urgent cleaning supplies.',
              createdAt: '2026-04-17T11:30:00Z', 
              updatedAt: '2026-04-17T14:15:00Z' 
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
              prNumber: 'PR-2026-001',
              branchId: '1',
              requestedBy: 'Khalid Abdullah',
              expectedDate: '2026-04-25T00:00:00Z',
              status: 'PENDING_APPROVAL',
              totalAmount: 14500.00,
              items: [
                { itemId: 'IT-1', quantity: 100, estimatedUnitCost: 45.50 },
                { itemId: 'IT-2', quantity: 5, estimatedUnitCost: 1250.00 },
              ],
              notes: 'Monthly staples replenishment.',
              createdAt: '2026-04-18T09:00:00Z', 
              updatedAt: '2026-04-18T09:00:00Z' 
            },
            { 
              id: 'PR-1002', 
              prNumber: 'PR-2026-002',
              branchId: '2',
              requestedBy: 'Fatima Ali',
              expectedDate: '2026-04-20T00:00:00Z',
              status: 'APPROVED',
              totalAmount: 350.00,
              items: [
                { itemId: 'IT-3', quantity: 10, estimatedUnitCost: 35.00 },
              ],
              notes: 'Urgent cleaning supplies.',
              createdAt: '2026-04-17T11:30:00Z', 
              updatedAt: '2026-04-17T14:15:00Z' 
            },
          ];
          
          const found = prs.find(p => p.id === id || p.prNumber === id);
          if (found) resolve(found);
          else reject(new Error("Not found"));
        }, 500);
      });
    }
  });
}
