'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

export const TransferLineLotAllocationSchema = z.object({
 lot_id: z.string(),
 lot_number: z.string(),
 expiry_date: z.string().nullable().optional(),
 allocated_qty: z.number(),
 override_reason: z.string().nullable().optional(),
});

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
 lot_allocations: z.array(TransferLineLotAllocationSchema).default([]),
});

export const TransferDetailSchema = z.object({
 id: z.string(),
 document_number: z.string(),
 transfer_status: BadgeStatusSchema,
 from_warehouse_id: z.string(),
 from_warehouse_name: z.string().optional(),
 to_warehouse_id: z.string(),
 to_warehouse_name: z.string().optional(),
 notes: z.string().nullable().optional(),
 shipped_at: z.string().nullable().optional(),
 received_at: z.string().nullable().optional(),
 variance_reason: z.string().nullable().optional(),
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
