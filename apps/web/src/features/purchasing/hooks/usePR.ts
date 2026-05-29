'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

const PRLineSchema = z.object({
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
 req_qty: z.number(),
 uom_id: z.string(),
});

export const PRDetailSchema = z.object({
 id: z.string(),
 document_number: z.string(),
 status: BadgeStatusSchema,
 department_id: z.string(),
 expected_date: z.string(),
 version: z.number().optional(),
 notes: z.string().nullable().optional(),
 created_at: z.string().optional(),
 created_by: z.string().optional(),
 updated_at: z.string().optional(),
 lines: z.array(PRLineSchema),
});

export type PRDetail = z.infer<typeof PRDetailSchema>;

export function usePR(id: string | null) {
  return useQuery({
    queryKey: ['purchase-requests', id],
    queryFn: ({ signal }) => apiClient.get(`/procurement/purchase-requests/${id}`, z.object({ data: PRDetailSchema }), { signal }).then(res => res.data),
    enabled: !!id && id !== 'undefined' && id !== 'null',
    staleTime: 60_000,
  });
}
