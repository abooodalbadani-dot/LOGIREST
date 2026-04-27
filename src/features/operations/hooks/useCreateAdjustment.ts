'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { AdjustmentDetailSchema } from './useAdjustment';

const LotAllocationSchema = z.object({
  lot_id: z.string(),
  qty: z.number()
});

const CreateAdjustmentPayloadSchema = z.object({
  warehouse_id: z.string(),
  reason: z.string(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    item_id: z.string(),
    qty: z.number(),
    uom_id: z.string(),
    lot_allocations: z.array(LotAllocationSchema).optional()
  }))
});

export type CreateAdjustmentPayload = z.infer<typeof CreateAdjustmentPayloadSchema>;

export function useCreateAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdjustmentPayload) => 
      apiClient.post('/operations/adjustments', AdjustmentDetailSchema, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
    }
  });
}
