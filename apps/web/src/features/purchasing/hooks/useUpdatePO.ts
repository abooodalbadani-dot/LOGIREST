'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { PODetailSchema } from './usePO';

const UpdatePOPayloadSchema = z.object({
 version: z.number(),
 prId: z.string().optional(),
 targetWarehouseId: z.string().optional(),
 supplierId: z.string(),
 currencyId: z.string(),
 exchangeRate: z.number(),
 expectedDate: z.string(),
 notes: z.string().optional().or(z.literal('')),
 lines: z.array(z.object({
  itemId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  uomId: z.string(),
  notes: z.string().optional().or(z.literal(''))
 }))
});

export type UpdatePOPayload = z.infer<typeof UpdatePOPayloadSchema>;

export function useUpdatePO(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ id, payload, signal }: { id: string; payload: UpdatePOPayload; signal?: AbortSignal }) => 
   apiClient.put(`/procurement/purchase-orders/${id}`, z.object({ data: PODetailSchema }), UpdatePOPayloadSchema.parse(payload), { signal }).then(res => res.data),
  onSuccess: (data, { id }) => {
   // Update cache
   queryClient.setQueryData(['purchase-orders', id], data);
   queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
   queryClient.invalidateQueries({ queryKey: ['purchase-orders', id] });
  },
  onError: (error) => {
   console.error('[useUpdatePO] Failed to update PO:', error);
  }
 });
}

