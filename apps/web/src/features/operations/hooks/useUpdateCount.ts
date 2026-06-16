'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const CountSchema = z.object({
 id: z.string(),
 sessionId: z.string(),
 itemId: z.string(),
 item: z.object({ id: z.string(), code: z.string(), nameAr: z.string(), nameEn: z.string() }),
 lotId: z.string().nullable(),
 snapshotQty: z.number(),
 countedQty: z.number().nullable(),
 variance: z.number().nullable(),
 varianceReason: z.string().nullable(),
});

export function useUpdateCount(sessionId: string, options?: { onConflict?: () => void }) {
 const qc = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ countId, countedQty, varianceReason, version, signal }: { countId: string; countedQty: number; varianceReason?: string; version: number; signal?: AbortSignal }) =>
   apiClient.put(`/stocktake/sessions/${sessionId}/counts/${countId}`, CountSchema, { countedQty, varianceReason, version }, { signal }),
  onSuccess: () => {
   qc.invalidateQueries({ queryKey: ['stocktakes', sessionId] });
  },
  onError: (error) => {
   console.error('Failed to update count:', error);
  }
 });
}
