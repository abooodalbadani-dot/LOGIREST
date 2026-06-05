'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { ALL_ISSUE_STATUSES } from '@logirest/shared-types';

export const IssueLineLotAllocationSchema = z.object({
  lotId: z.string(),
  lotNumber: z.string(),
  expiryDate: z.string().nullable().optional(),
  allocatedQty: z.number(),
  overrideReason: z.string().nullable().optional(),
});

export const IssueLineItemSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  itemId: z.string(),
  item: z.object({
    id: z.string(),
    code: z.string(),
    nameAr: z.string(),
    nameEn: z.string(),
    primaryUom: z.object({
      id: z.string(),
      code: z.string(),
      nameAr: z.string(),
      nameEn: z.string(),
    })
  }),
  lotId: z.string().nullable(),
  lot: z.object({
    id: z.string(),
    lotNumber: z.string(),
    expiryDate: z.string().nullable(),
    isExpired: z.boolean(),
  }).nullable(),
  qty: z.number(),
  uomId: z.string(),
  unitCost: z.number().nullable(),
  requestedQty: z.number(),
  issuedQty: z.number(),
  lotAllocations: z.array(IssueLineLotAllocationSchema).default([])
});

export const StockIssueDetailSchema = z.object({
  id: z.string(),
  documentNumber: z.string(),
  status: z.enum(ALL_ISSUE_STATUSES).default('DRAFT'),
  type: z.literal('ISSUE').default('ISSUE'),
  destinationDeptId: z.string().default(''),
  destinationDepartmentId: z.string().nullable().optional(),
  requestedBy: z.string().default(''),
  warehouseId: z.string(),
  branchId: z.string().default(''),
  notes: z.string().nullable(),
  createdBy: z.string().default(''),
  createdAt: z.string().default(''),
  updatedAt: z.string().default(''),
  postedAt: z.string().nullable(),
  postedBy: z.string().nullable(),
  version: z.number().default(1),
  lines: z.array(IssueLineItemSchema).default([])
});

export type StockIssueDetail = z.infer<typeof StockIssueDetailSchema>;

export function useIssue(id: string | null) {
  return useQuery({
    queryKey: ['issues', id],
    queryFn: ({ signal }) => apiClient.get(`/operations/issues/${id}`, StockIssueDetailSchema, { signal }),
    enabled: !!id && id !== 'new' && id !== 'undefined' && id !== 'null',
    staleTime: 60_000,
  });
}

