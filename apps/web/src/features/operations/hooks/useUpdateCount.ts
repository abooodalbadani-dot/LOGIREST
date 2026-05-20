'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const CountSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  item_id: z.string(),
  item: z.object({ id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string() }),
  lot_id: z.string().nullable(),
  snapshot_qty: z.number(),
  counted_qty: z.number().nullable(),
  variance: z.number().nullable(),
  variance_reason: z.string().nullable(),
});

export function useUpdateCount(sessionId: string, options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ countId, counted_qty, variance_reason, version, signal }: { countId: string; counted_qty: number; variance_reason?: string; version: number; signal?: AbortSignal }) =>
      apiClient.put(`/stocktake/sessions/${sessionId}/counts/${countId}`, CountSchema, { counted_qty, variance_reason, version }, { signal }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stocktakes', sessionId] });
    },
    onError: (error) => {
      console.error('Failed to update count:', error);
    }
  });
}
