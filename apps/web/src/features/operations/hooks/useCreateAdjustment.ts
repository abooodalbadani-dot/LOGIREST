'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { toast } from 'sonner';
import { AdjustmentDetailSchema } from './useAdjustment';

const LotAllocationSchema = z.object({
 lotId: z.string(),
 qty: z.number()
});

const CreateAdjustmentPayloadSchema = z.object({
 warehouseId: z.string().min(1, 'Warehouse is required'),
 reason: z.string().min(1, 'Reason category is required'),
 notes: z.string().min(10, 'Reason details must be at least 10 characters').optional().or(z.literal('')),
 lines: z.array(z.object({
  itemId: z.string(),
  qty: z.number().positive(),
  uomId: z.string(),
  direction: z.enum(['INCREASE', 'DECREASE']),
  unitCost: z.number().nullable().optional(),
  lotAllocations: z.array(LotAllocationSchema).optional(),
  isCustom: z.boolean().optional()
 })).min(1, 'At least one item is required')
});

export type CreateAdjustmentPayload = z.infer<typeof CreateAdjustmentPayloadSchema>;

const mapToBackendReason = (reason: string): 'THEFT' | 'DAMAGE' | 'SPOILAGE' | 'CORRECTION' | 'ADMIN_OVERRIDE' => {
  const upper = reason.toUpperCase();
  if (upper === 'THEFT') return 'THEFT';
  if (upper === 'DAMAGE') return 'DAMAGE';
  if (upper === 'SPOILAGE' || upper === 'EXPIRY') return 'SPOILAGE';
  if (upper === 'ADMIN_OVERRIDE') return 'ADMIN_OVERRIDE';
  return 'CORRECTION';
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string | undefined | null): value is string {
  return !!value && UUID_REGEX.test(value);
}

export function useCreateAdjustment(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
 onConflict: options?.onConflict,
 mutationFn: ({ payload, signal, headers }: { payload: CreateAdjustmentPayload; signal?: AbortSignal; headers?: Record<string, string> }) => {
  const parsed = CreateAdjustmentPayloadSchema.parse(payload);
  const backendPayload = {
   warehouseId: parsed.warehouseId,
   notes: parsed.notes,
   lines: parsed.lines.map(l => {
    const isIncrease = l.direction === 'INCREASE';
    return {
     itemId: l.itemId,
      lotId: isValidUuid(l.lotAllocations?.[0]?.lotId) ? l.lotAllocations![0].lotId : undefined,
     quantity: l.qty,
     direction: isIncrease ? ('IN' as const) : ('OUT' as const),
     reason: mapToBackendReason(parsed.reason),
     unitCost: l.unitCost ?? undefined
    };
   })
  };
  return apiClient.post('/operations/adjustments', AdjustmentDetailSchema, backendPayload, { signal, headers });
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['adjustments'] });
 queryClient.invalidateQueries({ queryKey: ['adjustments', 'summary'] });
 },
 onError: (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Operation failed';
  toast.error(message);
 },
 });
}
