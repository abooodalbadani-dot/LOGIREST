'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export const AdjustmentLineSchema = z.object({
  id: z.string(),
  item: z.object({
    id: z.string(),
    code: z.string(),
    name_ar: z.string(),
    name_en: z.string(),
    primary_uom: z.object({
      id: z.string(),
      code: z.string(),
    }),
  }),
  direction: z.enum(['INCREASE', 'DECREASE']),
  qty_before: z.number(),
  qty_adjusted: z.number(),
  uom_id: z.string(),
  reason_notes: z.string().optional(),
});

export const AdjustmentDetailSchema = z.object({
  id: z.string(),
  document_number: z.string(),
  status: z.string(),
  warehouse_id: z.string(),
  reason: z.string(),
  notes: z.string().nullable().optional(),
  approved_by: z.string().nullable().optional(),
  lines: z.array(AdjustmentLineSchema),
});

export type AdjustmentDetail = z.infer<typeof AdjustmentDetailSchema>;
export type AdjustmentLine = z.infer<typeof AdjustmentLineSchema>;

export function useAdjustment(id: string | null) {
  return useQuery({
    queryKey: ['adjustment', id],
    queryFn: () => apiClient.get(`/operations/adjustments/${id}`, AdjustmentDetailSchema),
    enabled: !!id,
    staleTime: 60_000,
  });
}
