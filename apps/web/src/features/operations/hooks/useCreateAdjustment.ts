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

const CreateAdjustmentPayloadSchema = z.object({
 warehouse_id: z.string().min(1, 'Warehouse is required'),
 reason: z.string().min(1, 'Reason category is required'),
 notes: z.string().min(10, 'Reason details must be at least 10 characters'),
 lines: z.array(z.object({
 item_id: z.string(),
 qty: z.number().positive(),
 uom_id: z.string(),
 direction: z.enum(['INCREASE', 'DECREASE']),
 lot_allocations: z.array(LotAllocationSchema).optional()
 })).min(1, 'At least one item is required')
});

export type CreateAdjustmentPayload = z.infer<typeof CreateAdjustmentPayloadSchema>;

export function useCreateAdjustment(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
 onConflict: options?.onConflict,
 mutationFn: ({ payload, signal }: { payload: CreateAdjustmentPayload; signal?: AbortSignal }) => 
 apiClient.post('/operations/adjustments', AdjustmentDetailSchema, CreateAdjustmentPayloadSchema.parse(payload), { signal }),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['adjustments'] });
 }
 });
}
