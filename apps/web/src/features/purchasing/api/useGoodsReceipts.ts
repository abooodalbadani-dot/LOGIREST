import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { GoodsReceipt, CreateGoodsReceiptDTO, GoodsReceiptLineItem } from '../types';
import { GRN_STATUS } from '@/contracts/statuses';


// Mock data
const mockGoodsReceipts: GoodsReceipt[] = [
  {
    id: 'grn-001',
    grnNumber: 'GRN-2024-001',
    poId: 'po-001',
    warehouseId: 'wh-001',
    supplierId: 'sup-001',
    status: GRN_STATUS.POSTED,
    supplierCurrency: 'USD',
    lockedExchangeRate: 3.75,
    baseTotalAmount: 7500,
    items: [
      {
        id: 'grn-li-001',
        poLineItemId: 'po-li-001',
        itemId: 'item-001',
        orderedQuantity: 100,
        receivedQuantity: 100,
        lotNumber: 'LOT-A100',
        expiryDate: '2025-12-31',
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdBy: 'user-1',
    postedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    postedBy: 'user-1',
  },
  {
    id: 'grn-002',
    grnNumber: 'GRN-2024-002',
    poId: 'po-002',
    warehouseId: 'wh-001',
    supplierId: 'sup-002',
    status: GRN_STATUS.RECEIVED,
    supplierCurrency: 'EUR',
    items: [
      {
        id: 'grn-li-002',
        poLineItemId: 'po-li-002',
        itemId: 'item-002',
        orderedQuantity: 50,
        receivedQuantity: 50,
        lotNumber: 'LOT-B200',
        expiryDate: '2026-06-30',
      },
      {
        id: 'grn-li-003',
        poLineItemId: 'po-li-003',
        itemId: 'item-003',
        orderedQuantity: 10,
        receivedQuantity: 8, // partial
        lotNumber: 'LOT-C300',
        expiryDate: '2025-01-15',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
  },
];

let nextId = 3;

export function useGoodsReceipts() {
  return useQuery({
    queryKey: ['grns'],
    queryFn: async ({ signal }) => {
      // Simulate network latency
      return new Promise<GoodsReceipt[]>((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve([...mockGoodsReceipts]);
        }, 800);

        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
    },
  });
}

export function useGoodsReceipt(id: string) {
  return useQuery({
    queryKey: ['grn', id],
    queryFn: async ({ signal }) => {
      return new Promise<GoodsReceipt>((resolve, reject) => {
        const timeout = setTimeout(() => {
          const grn = mockGoodsReceipts.find((p) => p.id === id);
          if (!grn) throw new Error('Goods Receipt not found');
          resolve({ ...grn });
        }, 500);

        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
    },
    enabled: !!id,
  });
}

export function useCreateGoodsReceipt() {
  const queryClient = useQueryClient();

  return useSafeMutation({
    mutationFn: async ({ signal, ...data }: CreateGoodsReceiptDTO & { signal?: AbortSignal }) => {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 1000);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
      
      const newGRN: GoodsReceipt = {
        id: `grn-00${nextId++}`,
        grnNumber: `GRN-2024-00${nextId}`,
        poId: data.poId,
        warehouseId: data.warehouseId,
        supplierId: data.supplierId,
        status: GRN_STATUS.RECEIVED,
        supplierCurrency: 'SAR', // Can be refined to fetch from PO
        items: data.items.map((i, idx) => ({ ...i, id: `grn-li-new-${idx}` })),
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-1',
      };
      
      mockGoodsReceipts.unshift(newGRN);
      return newGRN;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    },
  });
}

export function usePostGoodsReceipt() {
  const queryClient = useQueryClient();

  return useSafeMutation({
    mutationFn: async ({ id, lockedExchangeRate, baseTotalAmount, signal }: { id: string, lockedExchangeRate: number, baseTotalAmount: number, signal?: AbortSignal }) => {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 1000);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
      const index = mockGoodsReceipts.findIndex((p) => p.id === id);
      if (index === -1) throw new Error('Goods Receipt not found');
      
      const updatedGRN = {
        ...mockGoodsReceipts[index],
        status: GRN_STATUS.POSTED,
        lockedExchangeRate,
        baseTotalAmount,
        postedAt: new Date().toISOString(),
        postedBy: 'user-1',
        updatedAt: new Date().toISOString(),
      };
      
      mockGoodsReceipts[index] = updatedGRN;
      return updatedGRN;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['grn', id] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    },
  });
}
export function useUpdateGRNLine(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();

  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: async ({ grnId, item, signal }: { grnId: string, item: GoodsReceiptLineItem, signal?: AbortSignal }) => {
      // Simulation: no real network call
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 300);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
      return { grnId, item };
    },
    onMutate: async ({ grnId, item }) => {
      await queryClient.cancelQueries({ queryKey: ['grn', grnId] });
      const previousGRN = queryClient.getQueryData<GoodsReceipt>(['grn', grnId]);

      if (previousGRN) {
        const newItems = [...previousGRN.items];
        // Check if item already exists with this lot
        const existingIndex = newItems.findIndex(i => i.itemId === item.itemId && i.lotNumber === item.lotNumber);
        
        if (existingIndex > -1) {
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            receivedQuantity: item.receivedQuantity // Or increment logic depending on caller
          };
        } else {
          newItems.push({
            ...item,
            id: `grn-li-scan-${Date.now()}`
          });
        }

        queryClient.setQueryData(['grn', grnId], {
          ...previousGRN,
          items: newItems,
          updatedAt: new Date().toISOString()
        });
      }

      return { previousGRN };
    },
    onError: (err, { grnId }, context) => {
      if (context?.previousGRN) {
        queryClient.setQueryData(['grn', grnId], context.previousGRN);
      }
    },
    onSettled: (data, error, { grnId }) => {
      queryClient.invalidateQueries({ queryKey: ['grn', grnId] });
    },
  });
}
