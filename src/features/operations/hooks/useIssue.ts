'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/ui/status-badge';

export const IssueLineLotAllocationSchema = z.object({
  lot_id: z.string(),
  lot_number: z.string(),
  expiry_date: z.string().nullable().optional(),
  allocated_qty: z.number(),
  override_reason: z.string().nullable().optional(),
});

export const IssueLineItemSchema = z.object({
  id: z.string(),
  item: z.object({
    id: z.string(),
    code: z.string(),
    name_ar: z.string(),
    name_en: z.string(),
    primary_uom: z.object({
      id: z.string(),
      code: z.string(),
      name_ar: z.string().optional(),
      name_en: z.string().optional(),
    })
  }),
  qty: z.number(),
  uom_id: z.string(),
  lot_allocations: z.array(IssueLineLotAllocationSchema).default([])
});

export const StockIssueDetailSchema = z.object({
  id: z.string(),
  document_number: z.string(),
  status: BadgeStatusSchema,
  type: z.string().optional(),
  // Support both old and new field names
  destination_dept_id: z.string().nullable().optional(),
  destination_department_id: z.string().nullable().optional(),
  requested_by: z.string().nullable().optional(),
  warehouse_id: z.string(),
  branch_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  posted_at: z.string().nullable().optional(),
  posted_by: z.string().nullable().optional(),
  lines: z.array(IssueLineItemSchema).default([])
});

export type StockIssueDetail = z.infer<typeof StockIssueDetailSchema>;

export function useIssue(id: string | null) {
  return useQuery({
    queryKey: ['issue', id],
    queryFn: () => apiClient.get(`/operations/issues/${id}`, StockIssueDetailSchema),
    enabled: !!id && id !== 'new',
    staleTime: 60_000,
  });
}

