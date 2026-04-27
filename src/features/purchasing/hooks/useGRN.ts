'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

export const LineItemSchema = z.object({
  id: z.string(),
  item: z.object({
    id: z.string(),
    code: z.string(),
    name_ar: z.string(),
    name_en: z.string(),
    primary_uom: z.object({
      id: z.string(),
      code: z.string()
    })
  }),
  lot: z.object({
    id: z.string(),
    lot_number: z.string(),
    expiry_date: z.string().nullable()
  }).nullable(),
  qty: z.number(),
  received_qty: z.number(),
  uom_id: z.string(),
  unit_cost_foreign: z.number().nullable(),
  unit_cost_base: z.number().nullable()
});

export const GRNDetailSchema = z.object({
  id: z.string(),
  document_number: z.string(),
  status: BadgeStatusSchema,
  supplier_id: z.string(),
  po_id: z.string().nullable(),
  po_number: z.string().nullable(),
  currency_id: z.string(),
  warehouse_id: z.string(),
  fx_rate: z.number().nullable(),
  fx_rate_captured_at: z.string().nullable().optional(),
  notes: z.string().nullable(),
  lines: z.array(LineItemSchema)
});

export type GRNDetail = z.infer<typeof GRNDetailSchema>;

export function useGRN(id: string | null) {
  return useQuery({
    queryKey: ['grn', id],
    queryFn: () => apiClient.get(`/procurement/grns/${id}`, z.object({ data: GRNDetailSchema })).then(res => res.data),
    enabled: !!id && id !== 'new',
    staleTime: 60_000,
  });
}
