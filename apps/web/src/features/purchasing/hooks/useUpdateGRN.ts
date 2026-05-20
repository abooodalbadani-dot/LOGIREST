'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { GRNDetailSchema } from './useGRN';

const UpdateGRNPayloadSchema = z.object({
  version: z.number(),
  supplier_id: z.string(),
  currency_id: z.string(),
  warehouse_id: z.string(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    id: z.string().optional(), // Existing line ID if updating
    item_id: z.string(),
    lot_id: z.string().nullable(),
    qty: z.number().positive(),
    received_qty: z.number().positive(),
    uom_id: z.string(),
    unit_cost_foreign: z.number().nonnegative(),
  }))
});

export type UpdateGRNPayload = z.infer<typeof UpdateGRNPayloadSchema>;

export function useUpdateGRN(id: string, options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ payload, signal, headers }: { payload: UpdateGRNPayload; signal?: AbortSignal; headers?: Record<string, string> }) => 
      apiClient.put(`/procurement/grns/${id}`, z.object({ data: GRNDetailSchema }), UpdateGRNPayloadSchema.parse(payload), { signal, headers }).then(res => res.data),
    onSuccess: (data) => {
      queryClient.setQueryData(['grn', id], data);
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['grn', id] });
    },
    onError: (error) => {
      console.error('[useUpdateGRN] Failed to update GRN:', error);
    }
  });
}
