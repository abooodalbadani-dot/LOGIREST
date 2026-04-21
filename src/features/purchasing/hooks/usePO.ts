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
  qty: z.number(),
  uom_id: z.string(),
  unit_cost_foreign: z.number(),
});

const PODetailSchema = z.object({
  id: z.string(),
  document_number: z.string(),
  status: z.string(),
  supplier_id: z.string(),
  target_warehouse_id: z.string(),
  currency_id: z.string(),
  expected_delivery_date: z.string().optional(),
  total: z.number().optional(),
  linked_pr_id: z.string().nullable().optional(),
  linked_pr_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lines: z.array(POLineSchema),
});

export type PODetail = z.infer<typeof PODetailSchema>;

export function usePO(id: string) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => apiClient.get(`/procurement/purchase-orders/${id}`, z.object({ data: PODetailSchema })).then(res => res.data),
    enabled: !!id,
    staleTime: 60_000,
  });
}
