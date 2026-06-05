'use client';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';


import { ALL_STATUSES } from '@logirest/shared-types';

export const AdjustmentStatusSchema = z.enum(ALL_STATUSES);


export const AdjustmentLineSchema = z.object({
  id: z.string(),
  item: z.object({
    id: z.string(),
    code: z.string(),
    nameAr: z.string(),
    nameEn: z.string(),
    primaryUom: z.object({
      id: z.string(),
      code: z.string(),
    }),
  }),
  direction: z.enum(['INCREASE', 'DECREASE']),
  qtyBefore: z.number(),
  qtyAdjusted: z.number(),
  uomId: z.string(),
  unitCost: z.number().nullable().optional(),
  reasonNotes: z.string().optional(),
  lotAllocations: z.array(z.object({
    lotId: z.string(),
    qty: z.number(),
  })).optional(),
});

export const AdjustmentDetailSchema = z.object({
  id: z.string(),
  documentNumber: z.string(),
  status: AdjustmentStatusSchema,
  warehouseId: z.string(),
  reason: z.string(),
  notes: z.string().nullable().optional(),
  reject: z.string().nullable().optional(),
  movementId: z.string().nullable().optional(),
  approvedBy: z.string().nullable().optional(),
  postedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional().default(''),
  version: z.number().optional(),

  lines: z.array(AdjustmentLineSchema),
  timeline: z.array(z.object({
    status: z.string(),
    at: z.string(),
    by: z.string(),
  })).optional(),
});


export type AdjustmentDetail = z.infer<typeof AdjustmentDetailSchema>;
export type AdjustmentLine = z.infer<typeof AdjustmentLineSchema>;

export function useAdjustment(id: string | null) {
  return useQuery({
    queryKey: ['adjustments', id],
    queryFn: ({ signal }) => apiClient.get(`/operations/adjustments/${id}`, AdjustmentDetailSchema, { signal }),
    enabled: !!id && id !== 'undefined' && id !== 'null',
    staleTime: 60_000,
  });
}
