'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { ALL_TRANSFER_STATUSES, ALL_STATUSES } from '@logirest/shared-types';

export const TransferLineLotAllocationSchema = z.object({
 lotId: z.string(),
 lotNumber: z.string(),
 expiryDate: z.string().nullable().optional(),
 allocatedQty: z.number(),
 overrideReason: z.string().nullable().optional(),
});

export const TransferLineSchema = z.object({
 id: z.string(),
 documentId: z.string(),
 itemId: z.string(),
 item: z.object({
  id: z.string(),
  code: z.string(),
  name: z.string().optional(),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  primaryUom: z.object({
   id: z.string(),
   code: z.string(),
   name: z.string().optional(),
   nameAr: z.string().optional(),
   nameEn: z.string().optional(),
  }),
 }),
 lotId: z.string().nullable(),
 lot: z.object({
  id: z.string(),
  lotNumber: z.string(),
  expiryDate: z.string().nullable(),
  isExpired: z.boolean(),
 }).nullable(),
 qty: z.number(),
 unitCost: z.number().nullable(),
 shippedQty: z.number().default(0),
 receivedQty: z.number().nullable(),
 uomId: z.string(),
 lotAllocations: z.array(TransferLineLotAllocationSchema).default([]),
});

export const TransferDetailSchema = z.object({
 id: z.string(),
 documentNumber: z.string(),
 type: z.literal('TRANSFER').default('TRANSFER'),
 status: z.enum(ALL_STATUSES).default('DRAFT'),
 transferStatus: z.enum(ALL_TRANSFER_STATUSES).default('DRAFT'),
 fromWarehouseId: z.string(),
 fromWarehouseName: z.string().optional(),
 toWarehouseId: z.string(),
 toWarehouseName: z.string().optional(),
 warehouseId: z.string().default(''), 
 branchId: z.string().default(''), 
 notes: z.string().nullable(),
 shippedAt: z.string().nullable(),
 receivedAt: z.string().nullable(),
 varianceReason: z.string().nullable().optional(),
 createdBy: z.string().default(''),
 createdAt: z.string().default(''),
 postedAt: z.string().nullable(),
 postedBy: z.string().nullable(),
 version: z.number().default(1),
 updatedAt: z.string().default(''),
 lines: z.array(TransferLineSchema),
});


export type TransferDetail = z.infer<typeof TransferDetailSchema>;
export type TransferLine = z.infer<typeof TransferLineSchema>;

export function useTransfer(id: string | null) {
 return useQuery({
  queryKey: ['transfers', id],
  queryFn: ({ signal }) => apiClient.get(`/operations/transfers/${id}`, TransferDetailSchema, { signal }),
  enabled: !!id && id !== 'undefined' && id !== 'null',
  staleTime: 60_000,
 });
}
