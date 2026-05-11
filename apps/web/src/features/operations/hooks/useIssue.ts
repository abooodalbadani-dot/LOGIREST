'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { ALL_ISSUE_STATUSES } from '@/contracts/statuses';

export const IssueLineLotAllocationSchema = z.object({
 lot_id: z.string(),
 lot_number: z.string(),
 expiry_date: z.string().nullable().optional(),
 allocated_qty: z.number(),
 override_reason: z.string().nullable().optional(),
});

export const IssueLineItemSchema = z.object({
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
 })
 }),
 lot_id: z.string().nullable(),
 lot: z.object({
 id: z.string(),
 lot_number: z.string(),
 expiry_date: z.string().nullable(),
 is_expired: z.boolean(),
 }).nullable(),
 qty: z.number(),
 uom_id: z.string(),
 unit_cost: z.number().nullable(),
 requested_qty: z.number(),
 issued_qty: z.number(),
 lot_allocations: z.array(IssueLineLotAllocationSchema).default([])
});

export const StockIssueDetailSchema = z.object({
  id: z.string(),
  document_number: z.string(),
  status: z.enum(ALL_ISSUE_STATUSES).default('DRAFT'),
  type: z.literal('ISSUE').default('ISSUE'),
  destination_dept_id: z.string().default(''),
  destination_department_id: z.string().nullable().optional(),
  requested_by: z.string().default(''),
  warehouse_id: z.string(),
  branch_id: z.string().default(''),
  notes: z.string().nullable(),
  created_by: z.string().default(''),
  created_at: z.string().default(''),
  updated_at: z.string().default(''),
  posted_at: z.string().nullable(),
  posted_by: z.string().nullable(),
  version: z.number().default(1),
  lines: z.array(IssueLineItemSchema).default([])
});

export type StockIssueDetail = z.infer<typeof StockIssueDetailSchema>;

export function useIssue(id: string | null) {
  return useQuery({
    queryKey: ['issue', id],
    queryFn: ({ signal }) => apiClient.get(`/operations/issues/${id}`, StockIssueDetailSchema, signal),
    enabled: !!id && id !== 'new',
    staleTime: 60_000,
  });
}

