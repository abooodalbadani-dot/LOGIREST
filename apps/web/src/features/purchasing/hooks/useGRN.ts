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
  image: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  hasExpiry: z.boolean().optional(),
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
 uom: z.object({
  id: z.string(),
  code: z.string(),
  name: z.string().optional(),
 }).optional(),
 unitCostForeign: z.number().nullable().refine(val => val === null || val >= 0, {
  message: 'Must not be less than 0'
 }),
 unitCostBase: z.number().nullable()
}).superRefine((data, ctx) => {
 const hasExpiry = (data.item as { hasExpiry?: boolean })?.hasExpiry === true;
 if (hasExpiry && !data.lot?.id && !data.lot?.expiryDate) {
  ctx.addIssue({
   code: z.ZodIssueCode.custom,
   message: 'Expiry date is required for items with expiry tracking',
   path: ['lot', 'expiryDate'],
  });
 }
});

export const GRNDetailSchema = z.object({
 id: z.string(),
 documentNumber: z.string(),
 status: BadgeStatusSchema,
 supplierId: z.string(),
 supplierName: z.string().optional().nullable(),
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
 createdById: z.string().optional().nullable(),
 updatedAt: z.string().optional(),
 lines: z.array(LineItemSchema)
});

export type GRNDetail = z.infer<typeof GRNDetailSchema>;

const RobustDateSchema = z.union([z.string(), z.date()])
 .nullable()
 .optional()
 .transform((val) => {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) return val.toISOString();
  return val;
 });

const GRNLineItemResponseSchema = z.object({
 id: z.string().optional().nullable(),
 item: z.object({
  id: z.string(),
  code: z.string().nullish(),
  name: z.string().nullish(),
  nameAr: z.string().optional().nullable(),
  nameEn: z.string().optional().nullable(),
  hasExpiry: z.boolean().optional().nullable(),
  primaryUom: z.object({
   id: z.string().optional().nullable(),
   code: z.string().optional().nullable()
  }).nullish()
 }),
 lot: z.object({
  id: z.string().optional().nullable(),
  lotNumber: z.string().optional().nullable(),
  expiryDate: RobustDateSchema
 }).nullish(),
 qty: z.coerce.number().nullish(),
 receivedQty: z.coerce.number().nullish(),
 uomId: z.string().nullish(),
 uom: z.object({
  id: z.string(),
  code: z.string().optional().nullable(),
  name: z.string().optional().nullable()
 }).nullish(),
 unitCostForeign: z.coerce.number().nullish(),
 unitCostBase: z.coerce.number().nullish()
}).transform((val) => {
 return {
  id: val.id ?? '',
  item: {
   id: val.item.id,
   code: val.item.code ?? '',
   name: val.item.name ?? '',
   nameAr: val.item.nameAr ?? undefined,
   nameEn: val.item.nameEn ?? undefined,
   hasExpiry: val.item.hasExpiry ?? undefined,
   primaryUom: {
    id: val.item.primaryUom?.id ?? '',
    code: val.item.primaryUom?.code ?? ''
   }
  },
  lot: val.lot ? {
   id: val.lot.id ?? '',
   lotNumber: val.lot.lotNumber ?? '',
   expiryDate: val.lot.expiryDate ?? null
  } : null,
  qty: val.qty ?? 0,
  receivedQty: val.receivedQty ?? 0,
  uomId: val.uomId ?? '',
  uom: val.uom ? {
   id: val.uom.id,
   code: val.uom.code ?? '',
   name: val.uom.name ?? val.uom.code ?? ''
  } : undefined,
  unitCostForeign: val.unitCostForeign ?? null,
  unitCostBase: val.unitCostBase ?? null
 };
});

export const GRNDetailResponseSchema = z.object({
 id: z.string(),
 documentNumber: z.string(),
 status: BadgeStatusSchema,
 supplierId: z.string().nullish(),
 supplierName: z.string().nullish(),
 supplier: z.object({
  id: z.string(),
  name: z.string()
 }).optional().nullable(),
 poId: z.string().nullish(),
 poNumber: z.string().nullish(),
 poFxRate: z.coerce.number().nullish(),
 currencyId: z.string().nullish(),
 currencyCode: z.string().nullish(),
 warehouseId: z.string().nullish(),
 warehouseName: z.string().nullish(),
 fxRate: z.coerce.number().nullish(),
 fxRateCapturedAt: RobustDateSchema,
 version: z.coerce.number().nullish(),
 notes: z.string().nullish(),
 createdAt: RobustDateSchema,
 createdBy: z.string().nullish(),
 createdById: z.string().nullish(),
 updatedAt: RobustDateSchema,
 lines: z.array(GRNLineItemResponseSchema).default([])
}).transform((val) => {
 return {
  id: val.id,
  documentNumber: val.documentNumber,
  status: val.status,
  supplierId: val.supplierId ?? '',
  supplierName: val.supplierName ?? val.supplier?.name ?? undefined,
  supplier: val.supplier ? {
   id: val.supplier.id,
   name: val.supplier.name
  } : undefined,
  poId: val.poId ?? null,
  poNumber: val.poNumber ?? null,
  poFxRate: val.poFxRate ?? undefined,
  currencyId: val.currencyId ?? '',
  currencyCode: val.currencyCode ?? null,
  warehouseId: val.warehouseId ?? '',
  warehouseName: val.warehouseName ?? null,
  fxRate: val.fxRate ?? null,
  fxRateCapturedAt: val.fxRateCapturedAt ?? undefined,
  version: val.version ?? 1,
  notes: val.notes ?? null,
  createdAt: val.createdAt ?? undefined,
  createdBy: val.createdBy ?? undefined,
  createdById: val.createdById ?? undefined,
  updatedAt: val.updatedAt ?? undefined,
  lines: val.lines
 };
});

export function useGRN(id: string | null) {
 return useQuery({
  queryKey: ['grn', id],
  queryFn: ({ signal }) => apiClient.get(`/procurement/grns/${id}`, z.object({ data: GRNDetailResponseSchema }), { signal }).then(res => res.data),
  enabled: !!id && id !== 'new' && id !== 'undefined' && id !== 'null',
  staleTime: 0,
 });
}
