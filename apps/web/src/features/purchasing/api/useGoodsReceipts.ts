import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { toast } from 'sonner';
import { GoodsReceipt, CreateGoodsReceiptDTO, GoodsReceiptLineItem } from '../types';
import { GRN_STATUS } from '@logirest/shared-types';
import { paginatedSchema } from '@/types/api';

const GoodsReceiptLineItemSchema = z.object({
 id: z.string().optional(),
 poLineItemId: z.string(),
 itemId: z.string(),
 orderedQuantity: z.number(),
 receivedQuantity: z.number(),
 lotNumber: z.string(),
 expiryDate: z.string(),
 notes: z.string().optional(),
});

const GoodsReceiptSchema = z.object({
 id: z.string(),
 grnNumber: z.string(),
 poId: z.string(),
 warehouseId: z.string(),
 supplierId: z.string(),
 status: z.nativeEnum(GRN_STATUS),
 items: z.array(GoodsReceiptLineItemSchema),
 supplierCurrency: z.string(),
 lockedExchangeRate: z.number().optional(),
 baseTotalAmount: z.number().optional(),
 notes: z.string().optional(),
 createdAt: z.string(),
 updatedAt: z.string(),
 createdBy: z.string(),
 postedAt: z.string().optional(),
 postedBy: z.string().optional(),
});

export function useGoodsReceipts() {
 return useQuery({
  queryKey: ['grns'],
  queryFn: ({ signal }) => 
   apiClient.get('/procurement/grns', paginatedSchema(GoodsReceiptSchema), { signal }).then(res => res.data),
 });
}

export function useGoodsReceipt(id: string) {
 return useQuery({
  queryKey: ['grn', id],
  queryFn: ({ signal }) => 
   apiClient.get(`/procurement/grns/${id}`, z.object({ data: GoodsReceiptSchema }), { signal }).then(res => res.data),
  enabled: !!id,
 });
}

export function useCreateGoodsReceipt() {
 const queryClient = useQueryClient();

 return useSafeMutation({
  mutationFn: ({ signal, ...data }: CreateGoodsReceiptDTO & { signal?: AbortSignal }) => 
   apiClient.post('/procurement/grns', z.object({ data: GoodsReceiptSchema }), data, { signal }).then(res => res.data),
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
  mutationFn: ({ id, lockedExchangeRate, baseTotalAmount, signal }: { id: string, lockedExchangeRate: number, baseTotalAmount: number, signal?: AbortSignal }) => 
   apiClient.post(`/procurement/grns/${id}/post`, z.object({ data: GoodsReceiptSchema }), { lockedExchangeRate, baseTotalAmount }, { signal }).then(res => res.data),
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
  mutationFn: ({ grnId, item, signal }: { grnId: string, item: GoodsReceiptLineItem, signal?: AbortSignal }) => 
   apiClient.put(`/procurement/grns/${grnId}/lines`, z.object({ success: z.boolean() }), item, { signal }),
  onMutate: async ({ grnId, item }) => {
   await queryClient.cancelQueries({ queryKey: ['grn', grnId] });
   const previousGRN = queryClient.getQueryData<GoodsReceipt>(['grn', grnId]);

   if (previousGRN) {
    const newItems = [...previousGRN.items];
    const existingIndex = newItems.findIndex(i => i.itemId === item.itemId && i.lotNumber === item.lotNumber);
    
    if (existingIndex > -1) {
     newItems[existingIndex] = {
      ...newItems[existingIndex],
      receivedQuantity: item.receivedQuantity
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
