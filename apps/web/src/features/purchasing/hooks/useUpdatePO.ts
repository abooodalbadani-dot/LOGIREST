'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { PODetailSchema } from './usePO';

const UpdatePOPayloadSchema = z.object({
  version: z.number(),
  pr_id: z.string().optional(),
  target_warehouse_id: z.string().optional(),
  supplier_id: z.string(),
  currency_code: z.string(),
  exchange_rate: z.number(),
  expected_date: z.string(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    item_id: z.string(),
    quantity: z.number().positive(),
    unit_price: z.number().nonnegative(),
    uom_id: z.string(),
    notes: z.string().optional()
  }))
});

export type UpdatePOPayload = z.infer<typeof UpdatePOPayloadSchema>;

export function useUpdatePO(id: string, options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ payload, signal }: { payload: UpdatePOPayload; signal?: AbortSignal }) => 
      apiClient.put(`/procurement/purchase-orders/${id}`, z.object({ data: PODetailSchema }), UpdatePOPayloadSchema.parse(payload), signal).then(res => res.data),
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(['purchase-order', id], data);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => {
      console.error('[useUpdatePO] Failed to update PO:', error);
    }
  });
}

