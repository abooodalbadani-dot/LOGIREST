'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { ALL_DOCUMENT_STATUSES } from '@/types/DocumentStatus';

const AuditLogSchema = z.object({
  status: z.string(),
  createdAt: z.string(),
  userName: z.string().nullable().optional(),
});

const POLineSchema = z.object({
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
    }),
  }).optional(),
  itemId: z.string().optional(),
  itemSku: z.string().optional(),
  itemName: z.string().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  uomId: z.string(),
  notes: z.string().optional(),
});

export const PODetailSchema = z.object({
  id: z.string(),
  documentNumber: z.string(),
  status: z.enum(ALL_DOCUMENT_STATUSES),
  prId: z.string().nullable().optional(),
  version: z.number().optional(),
  supplierId: z.string(),
  supplierName: z.string().optional(),
  warehouseName: z.string().optional(),
  currencyCode: z.string().optional(),
  currencyId: z.string().optional(),
  exchangeRate: z.number().optional(),
  expectedDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  targetWarehouseId: z.string().optional(),
  lines: z.array(POLineSchema),
  supplierTotalAmount: z.number().optional(),
  baseTotalAmount: z.number().optional(),
  total: z.number().optional(),
  notes: z.string().nullable().optional(),
  auditLog: z.array(AuditLogSchema).optional(),
  createdAt: z.string().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PODetail = z.infer<typeof PODetailSchema>;
export type POLine = z.infer<typeof POLineSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;

export function usePO(id: string) {
  return useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: ({ signal }) => apiClient.get(`/procurement/purchase-orders/${id}`, z.object({ data: PODetailSchema }), { signal }).then(res => res.data),
    enabled: !!id && id !== 'undefined' && id !== 'null',
    staleTime: 30_000,
  });
}
