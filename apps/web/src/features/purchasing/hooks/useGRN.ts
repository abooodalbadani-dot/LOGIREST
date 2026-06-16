'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

export const LineItemSchema = z.object({
 id: z.string(),
 item: z.object({
  id: z.string().min(1, 'Required'),
  code: z.string(),
  name: z.string(),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  primaryUom: z.object({
   id: z.string(),
   code: z.string()
  })
 }),
 lot: z.object({
  id: z.string(),
  lotNumber: z.string(),
  expiryDate: z.string().nullable()
 }).nullable(),
 qty: z.number(),
 receivedQty: z.number().min(0, 'Must not be less than 0'),
 uomId: z.string(),
 unitCostForeign: z.number().nullable().refine(val => val === null || val >= 0, {
  message: 'Must not be less than 0'
 }),
 unitCostBase: z.number().nullable()
});

export const GRNDetailSchema = z.object({
 id: z.string(),
 documentNumber: z.string(),
 status: BadgeStatusSchema,
 supplierId: z.string(),
 supplier: z.object({
 id: z.string(),
 name: z.string()
 }).optional(),
 poId: z.string().nullable(),
 poNumber: z.string().nullable(),
 poFxRate: z.number().nullable().optional(),
 currencyId: z.string(),
 currencyCode: z.string().optional().nullable(),
 warehouseId: z.string(),
 warehouseName: z.string().optional().nullable(),
 fxRate: z.number().nullable(),
 fxRateCapturedAt: z.string().nullable().optional(),
 version: z.number(),
 notes: z.string().nullable(),
 createdAt: z.string().optional(),
 createdBy: z.string().optional(),
 updatedAt: z.string().optional(),
 lines: z.array(LineItemSchema)
});

export type GRNDetail = z.infer<typeof GRNDetailSchema>;

export function useGRN(id: string | null) {
 return useQuery({
  queryKey: ['grn', id],
  queryFn: ({ signal }) => apiClient.get(`/procurement/grns/${id}`, z.object({ data: GRNDetailSchema }), { signal }).then(res => res.data),
  enabled: !!id && id !== 'new' && id !== 'undefined' && id !== 'null',
  staleTime: 60_000,
 });
}
