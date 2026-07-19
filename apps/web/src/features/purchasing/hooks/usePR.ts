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
  name: z.string(),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  primaryUom: z.object({
   id: z.string(),
   code: z.string(),
   name: z.string().optional(),
  }),
  minStockLevel: z.number().optional(),
  reorderPoint: z.number().optional(),
  image: z.string().nullable().optional(),
 }),
 reqQty: z.number(),
 uomId: z.string(),
});

export const PRDetailSchema = z.object({
 id: z.string(),
 documentNumber: z.string(),
 status: BadgeStatusSchema,
 departmentId: z.string(),
 warehouseId: z.string().optional().nullable(),
 warehouseName: z.string().optional().nullable(),
 branchId: z.string().optional().nullable(),
 branchName: z.string().optional().nullable(),
 expectedDate: z.string(),
 version: z.number().optional(),
 notes: z.string().nullable().optional(),
 createdAt: z.string().optional(),
 createdBy: z.string().optional(),
 updatedAt: z.string().optional(),
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
