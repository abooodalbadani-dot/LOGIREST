'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const POLineSchema = z.object({
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
  quantity: z.number(),
  unit_price: z.number(),
  uom_id: z.string(),
  notes: z.string().optional(),
});

export const PODetailSchema = z.object({
  id: z.string(),
  document_number: z.string(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']),
  pr_id: z.string().nullable().optional(),
  supplier_id: z.string(),
  currency_code: z.string(),
  exchange_rate: z.number(),
  expected_date: z.string(),
  lines: z.array(POLineSchema),
  supplier_total_amount: z.number(),
  base_total_amount: z.number(),
  notes: z.string().nullable().optional(),
  created_at: z.string().optional(),
  created_by: z.string().optional(),
  updated_at: z.string().optional(),
});

export type PODetail = z.infer<typeof PODetailSchema>;

export function usePO(id: string) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => apiClient.get(`/procurement/purchase-orders/${id}`, z.object({ data: PODetailSchema })).then(res => res.data),
    enabled: !!id,
    staleTime: 30_000,
  });
}
