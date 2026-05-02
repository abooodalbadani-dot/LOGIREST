'use client';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';


export const AdjustmentStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'POSTED']);
export type AdjustmentStatus = z.infer<typeof AdjustmentStatusSchema>;

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
 status: AdjustmentStatusSchema,
 warehouse_id: z.string(),
 reason: z.string(),
 notes: z.string().nullable().optional(),
 reject: z.string().nullable().optional(),
 movement_id: z.string().nullable().optional(),
 approved_by: z.string().nullable().optional(),
 posted_at: z.string().nullable().optional(),
 created_at: z.string().optional(),
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
 queryKey: ['adjustment', id],
 queryFn: () => apiClient.get(`/operations/adjustments/ ${id}`, AdjustmentDetailSchema),
 enabled: !!id,
 staleTime: 60_000,
 });
}
