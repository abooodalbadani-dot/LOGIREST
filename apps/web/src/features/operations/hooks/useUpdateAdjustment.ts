'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { AdjustmentDetailSchema } from './useAdjustment';

const LotAllocationSchema = z.object({
 lotId: z.string(),
 qty: z.number()
});

const UpdateAdjustmentPayloadSchema = z.object({
 version: z.number(),
 warehouseId: z.string().optional(),
 reason: z.string().optional(),
 notes: z.string().optional(),
 lines: z.array(z.object({
  id: z.string().optional(),
  itemId: z.string(),
  qty: z.number().positive(),
  uomId: z.string(),
  direction: z.enum(['INCREASE', 'DECREASE']),
  unitCost: z.number().nullable().optional(),
  isCustom: z.boolean().optional(),
  lotAllocations: z.array(LotAllocationSchema).optional()
 })).optional()
});

export type UpdateAdjustmentPayload = z.infer<typeof UpdateAdjustmentPayloadSchema>;

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

export function useUpdateAdjustment(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ id, payload, signal, headers }: { id: string; payload: UpdateAdjustmentPayload; signal?: AbortSignal; headers?: Record<string, string> }) => {
   const parsed = UpdateAdjustmentPayloadSchema.parse(payload);
   const backendPayload = {
    version: parsed.version,
    warehouseId: parsed.warehouseId,
    reason: parsed.reason ? mapToBackendReason(parsed.reason) : undefined,
    notes: parsed.notes,
    lines: parsed.lines?.map(l => ({
     id: l.id,
     itemId: l.itemId,
     qty: l.qty,
     uomId: l.uomId,
     direction: l.direction,
     unitCost: l.unitCost ?? null,
     lotId: l.lotAllocations?.[0]?.lotId || null,
    }))
   };
   return apiClient.put(`/operations/adjustments/${id}`, AdjustmentDetailSchema, backendPayload, { signal, headers });
  },
  onSuccess: (data) => {
   queryClient.setQueryData(['adjustments', data.id], data);
   queryClient.invalidateQueries({ queryKey: ['adjustments'] });
   queryClient.invalidateQueries({ queryKey: ['adjustments', data.id] });
   queryClient.invalidateQueries({ queryKey: ['lots-available'] });
  },
  onError: (error) => {
   console.error('[useUpdateAdjustment] Failed to update adjustment:', error);
  }
 });
}


