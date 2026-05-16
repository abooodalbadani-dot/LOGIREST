'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { AdjustmentDetailSchema } from './useAdjustment';

const LotAllocationSchema = z.object({
  lot_id: z.string(),
  qty: z.number()
});

const UpdateAdjustmentPayloadSchema = z.object({
  version: z.number(),
  warehouse_id: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    id: z.string().optional(),
    item_id: z.string(),
    qty: z.number().positive(),
    uom_id: z.string(),
    direction: z.enum(['INCREASE', 'DECREASE']),
    lot_allocations: z.array(LotAllocationSchema).optional()
  })).optional()
});

export type UpdateAdjustmentPayload = z.infer<typeof UpdateAdjustmentPayloadSchema>;

export function useUpdateAdjustment(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, payload, signal }: { id: string; payload: UpdateAdjustmentPayload; signal?: AbortSignal }) => 
      apiClient.put(`/operations/adjustments/${id}`, AdjustmentDetailSchema, UpdateAdjustmentPayloadSchema.parse(payload), { signal }),
    onSuccess: (data) => {
      queryClient.setQueryData(['adjustment', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
    },
    onError: (error) => {
      console.error('[useUpdateAdjustment] Failed to update adjustment:', error);
    }
  });
}

