'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useUpdateCount(sessionId: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ countId, counted_qty, variance_reason }: { countId: string; counted_qty: number; variance_reason?: string }) =>
 apiClient.put(`/stocktake/sessions/ ${sessionId}/counts/ ${countId}`, CountSchema, { counted_qty, variance_reason }),
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ['stocktake-session', sessionId] });
 },
 });
}
