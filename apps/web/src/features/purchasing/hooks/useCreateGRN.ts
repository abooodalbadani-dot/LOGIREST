'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { GRNDetailSchema } from './useGRN';

const CreateGRNPayloadSchema = z.object({
  po_id: z.string().nullable().optional(),
  supplier_id: z.string(),
  currency_id: z.string(),
  warehouse_id: z.string(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    item_id: z.string(),
    lot_id: z.string().nullable(),
    qty: z.number().positive(),
    received_qty: z.number().positive(),
    uom_id: z.string(),
    unit_cost_foreign: z.number().nonnegative(),
  }))
});

export type CreateGRNPayload = z.infer<typeof CreateGRNPayloadSchema>;

export function useCreateGRN(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ payload, signal }: { payload: CreateGRNPayload; signal?: AbortSignal }) => 
      apiClient.post('/procurement/grns', z.object({ data: GRNDetailSchema }), CreateGRNPayloadSchema.parse(payload), signal).then(res => res.data),
    onSuccess: (data) => {
      queryClient.setQueryData(['grn', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['grns'] });
    }
  });
}
