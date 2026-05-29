'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { ALL_DOCUMENT_STATUSES } from '@/types/DocumentStatus';

const AuditLogSchema = z.object({
 status: z.string(),
 created_at: z.string(),
 user_name: z.string().nullable().optional(),
});

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
 }).optional(),
 item_id: z.string().optional(),
 item_sku: z.string().optional(),
 item_name: z.string().optional(),
 quantity: z.number().optional(),
 qty: z.number().optional(),
 unit_price: z.number().optional(),
 unit_cost_foreign: z.number().optional(),
 uom_id: z.string(),
 notes: z.string().optional(),
});

export const PODetailSchema = z.object({
 id: z.string(),
 document_number: z.string(),
 status: z.enum(ALL_DOCUMENT_STATUSES),
 pr_id: z.string().nullable().optional(),
 version: z.number().optional(),
 supplier_id: z.string(),
 supplier_name: z.string().optional(),
 warehouse_name: z.string().optional(),
 currency_code: z.string().optional(),
 currency_id: z.string().optional(),
 exchange_rate: z.number().optional(),
 expected_date: z.string().optional(),
 expected_delivery_date: z.string().optional(),
 target_warehouse_id: z.string().optional(),
 lines: z.array(POLineSchema),
 supplier_total_amount: z.number().optional(),
 base_total_amount: z.number().optional(),
 total: z.number().optional(),
 notes: z.string().nullable().optional(),
 audit_log: z.array(AuditLogSchema).optional(),
 created_at: z.string().optional(),
 created_by: z.string().optional(),
 updated_at: z.string().optional(),
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
