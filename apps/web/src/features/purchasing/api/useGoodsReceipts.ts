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

const RobustDateSchema = z.union([z.string(), z.date()])
 .nullable()
 .optional()
 .transform((val) => {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) return val.toISOString();
  return val;
 });

const GoodsReceiptLineItemResponseSchema = z.object({
 id: z.string().optional().nullable(),
 itemId: z.string().optional().nullable(),
 item: z.object({
  id: z.string(),
  code: z.string().nullish(),
  name: z.string().nullish(),
 }).nullish(),
 qty: z.coerce.number().nullish(),
 receivedQty: z.coerce.number().nullish(),
 orderedQuantity: z.coerce.number().nullish(),
 receivedQuantity: z.coerce.number().nullish(),
 lot: z.object({
  id: z.string().optional().nullable(),
  lotNumber: z.string().optional().nullable(),
  expiryDate: RobustDateSchema
 }).nullish(),
 lotNumber: z.string().nullish(),
 expiryDate: RobustDateSchema,
 notes: z.string().nullish(),
 poLineItemId: z.string().nullish(),
}).transform((val) => {
 return {
  id: val.id ?? undefined,
  poLineItemId: val.poLineItemId ?? '',
  itemId: val.item?.id ?? val.itemId ?? '',
  orderedQuantity: val.qty ?? val.orderedQuantity ?? 0,
  receivedQuantity: val.receivedQty ?? val.receivedQuantity ?? 0,
  lotNumber: val.lot?.lotNumber ?? val.lotNumber ?? '',
  expiryDate: val.lot?.expiryDate ?? val.expiryDate ?? '',
  notes: val.notes ?? undefined
 };
});

const GoodsReceiptResponseSchema = z.object({
 id: z.string(),
 grnNumber: z.string().nullish(),
 documentNumber: z.string().nullish(),
 poId: z.string().nullish(),
 warehouseId: z.string().nullish(),
 supplierId: z.string().nullish(),
 status: z.nativeEnum(GRN_STATUS).nullish(),
 lines: z.array(GoodsReceiptLineItemResponseSchema).optional(),
 items: z.array(GoodsReceiptLineItemResponseSchema).optional(),
 supplierCurrency: z.string().nullish(),
 currencyCode: z.string().nullish(),
 lockedExchangeRate: z.coerce.number().nullish(),
 baseTotalAmount: z.coerce.number().nullish(),
 notes: z.string().nullish(),
 createdAt: RobustDateSchema,
 updatedAt: RobustDateSchema,
 createdBy: z.string().nullish(),
 postedAt: RobustDateSchema,
 postedBy: z.string().nullish(),
}).transform((val) => {
 const finalItems = val.items || val.lines || [];
 return {
  id: val.id,
  grnNumber: val.grnNumber ?? val.documentNumber ?? '',
  poId: val.poId ?? '',
  warehouseId: val.warehouseId ?? '',
  supplierId: val.supplierId ?? '',
  status: val.status ?? GRN_STATUS.DRAFT,
  items: finalItems,
  supplierCurrency: val.supplierCurrency ?? val.currencyCode ?? '',
  lockedExchangeRate: val.lockedExchangeRate ?? undefined,
  baseTotalAmount: val.baseTotalAmount ?? undefined,
  notes: val.notes ?? undefined,
  createdAt: val.createdAt ?? '',
  updatedAt: val.updatedAt ?? '',
  createdBy: val.createdBy ?? '',
  postedAt: val.postedAt ?? undefined,
  postedBy: val.postedBy ?? undefined
 };
});

export function useGoodsReceipts() {
 return useQuery({
  queryKey: ['goods-receipts'],
  queryFn: ({ signal }) => 
   apiClient.get('/procurement/grns', paginatedSchema(GoodsReceiptResponseSchema), { signal }).then(res => res.data),
 });
}

export function useGoodsReceipt(id: string) {
 return useQuery({
  queryKey: ['goods-receipt', id],
  queryFn: ({ signal }) => 
   apiClient.get(`/procurement/grns/${id}`, z.object({ data: GoodsReceiptResponseSchema }), { signal }).then(res => res.data),
  enabled: !!id,
 });
}

export function useCreateGoodsReceipt() {
 const queryClient = useQueryClient();

 return useSafeMutation({
  mutationFn: ({ signal, ...data }: CreateGoodsReceiptDTO & { signal?: AbortSignal }) => 
   apiClient.post('/procurement/grns', z.object({ data: GoodsReceiptResponseSchema }), data, { signal }).then(res => res.data),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
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
   apiClient.post(`/procurement/grns/${id}/post`, z.object({ data: GoodsReceiptResponseSchema }), { lockedExchangeRate, baseTotalAmount }, { signal }).then(res => res.data),
  onSuccess: (_, { id }) => {
   queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
   queryClient.invalidateQueries({ queryKey: ['goods-receipt', id] });
   queryClient.invalidateQueries({ queryKey: ['grn', id] }); // Invalidate standard GRN cache too
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
   await queryClient.cancelQueries({ queryKey: ['goods-receipt', grnId] });
   const previousGRN = queryClient.getQueryData<GoodsReceipt>(['goods-receipt', grnId]);

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

    queryClient.setQueryData(['goods-receipt', grnId], {
     ...previousGRN,
     items: newItems,
     updatedAt: new Date().toISOString()
    });
   }

   return { previousGRN };
  },
  onError: (err, { grnId }, context) => {
   if (context?.previousGRN) {
    queryClient.setQueryData(['goods-receipt', grnId], context.previousGRN);
   }
  },
  onSettled: (data, error, { grnId }) => {
   queryClient.invalidateQueries({ queryKey: ['goods-receipt', grnId] });
   queryClient.invalidateQueries({ queryKey: ['grn', grnId] }); // Invalidate standard GRN cache too
  },
 });
}
