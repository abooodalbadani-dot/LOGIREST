'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { ALL_TRANSFER_STATUSES, ALL_STATUSES } from '@/contracts/statuses';

export const TransferLineLotAllocationSchema = z.object({
 lot_id: z.string(),
 lot_number: z.string(),
 expiry_date: z.string().nullable().optional(),
 allocated_qty: z.number(),
 override_reason: z.string().nullable().optional(),
});

export const TransferLineSchema = z.object({
 id: z.string(),
 document_id: z.string(),
 item_id: z.string(),
 item: z.object({
 id: z.string(),
 code: z.string(),
 name_ar: z.string(),
 name_en: z.string(),
 primary_uom: z.object({
 id: z.string(),
 code: z.string(),
 name_ar: z.string(),
 name_en: z.string(),
 }),
 }),
  lot_id: z.string().nullable(),
  lot: z.object({
    id: z.string(),
    lot_number: z.string(),
    expiry_date: z.string().nullable(),
    is_expired: z.boolean(),
  }).nullable(),
  qty: z.number(),
 unit_cost: z.number().nullable(),
 shipped_qty: z.number().default(0),
 received_qty: z.number().nullable(),
 uom_id: z.string(),
 lot_allocations: z.array(TransferLineLotAllocationSchema).default([]),
});

export const TransferDetailSchema = z.object({
  id: z.string(),
  document_number: z.string(),
  type: z.literal('TRANSFER').default('TRANSFER'),
  status: z.enum(ALL_STATUSES).default('DRAFT'),
  transfer_status: z.enum(ALL_TRANSFER_STATUSES).default('DRAFT'),
  from_warehouse_id: z.string(),
  from_warehouse_name: z.string().optional(),
  to_warehouse_id: z.string(),
  to_warehouse_name: z.string().optional(),
  warehouse_id: z.string().default(''), 
  branch_id: z.string().default(''), 
  notes: z.string().nullable(),
  shipped_at: z.string().nullable(),
  received_at: z.string().nullable(),
  variance_reason: z.string().nullable().optional(),
  created_by: z.string().default(''),
  created_at: z.string().default(''),
  posted_at: z.string().nullable(),
  posted_by: z.string().nullable(),
  version: z.number().default(1),
  updated_at: z.string().default(''),
  lines: z.array(TransferLineSchema),
});


export type TransferDetail = z.infer<typeof TransferDetailSchema>;
export type TransferLine = z.infer<typeof TransferLineSchema>;

export function useTransfer(id: string | null) {
  return useQuery({
    queryKey: ['transfer', id],
    queryFn: ({ signal }) => apiClient.get(`/operations/transfers/${id}`, TransferDetailSchema, { signal }),
    enabled: !!id,
    staleTime: 60_000,
  });
}
