'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export const TransferLineSchema = z.object({
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
  qty: z.number(),
  shipped_qty: z.number().nullable().optional(),
  received_qty: z.number().nullable().optional(),
  uom_id: z.string(),
  lot_allocations: z.array(z.any()).optional(),
});

export const TransferDetailSchema = z.object({
  id: z.string(),
  document_number: z.string(),
  transfer_status: z.string(),
  from_warehouse_id: z.string(),
  to_warehouse_id: z.string(),
  notes: z.string().nullable().optional(),
  shipped_at: z.string().nullable().optional(),
  received_at: z.string().nullable().optional(),
  lines: z.array(TransferLineSchema),
});

export type TransferDetail = z.infer<typeof TransferDetailSchema>;
export type TransferLine = z.infer<typeof TransferLineSchema>;

export function useTransfer(id: string | null) {
  return useQuery({
    queryKey: ['transfer', id],
    queryFn: () => apiClient.get(`/operations/transfers/${id}`, TransferDetailSchema),
    enabled: !!id,
    staleTime: 60_000,
  });
}
