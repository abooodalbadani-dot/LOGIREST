'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { StockIssueDetailSchema, StockIssueDetail } from './useIssue';
import { invalidateIssueQueries } from '@/lib/react-query/invalidation';

export const UpdateIssueLineAllocationSchema = z.object({
  lotId: z.string().optional(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional().nullable(),
  allocatedQty: z.number().optional(),
  quantityAllocated: z.number().optional(),
});

export const UpdateIssueLineSchema = z.object({
  itemId: z.string().min(1),
  requestedQty: z.number().optional(),
  quantity: z.number().optional(),
  uomId: z.string().optional(),
  lotAllocations: z.array(UpdateIssueLineAllocationSchema).optional(),
});

export const UpdateIssuePayloadSchema = z.object({
  version: z.number().optional(),
  destinationDeptId: z.string().optional(),
  departmentId: z.string().optional(),
  warehouseId: z.string().optional(),
  lines: z.array(UpdateIssueLineSchema).optional(),
  notes: z.string().optional(),
});

export type UpdateIssuePayload = z.infer<typeof UpdateIssuePayloadSchema>;

export function useUpdateIssue(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();

  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({
      id,
      payload,
      signal,
      headers,
    }: {
      id: string;
      payload: UpdateIssuePayload;
      signal?: AbortSignal;
      headers?: Record<string, string>;
    }) => {
      const parsed = UpdateIssuePayloadSchema.parse(payload);
      return apiClient.put<StockIssueDetail>(
        `/operations/issues/${id}`,
        StockIssueDetailSchema,
        parsed,
        { signal, headers }
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['issues', data.id], data);
      invalidateIssueQueries(queryClient, data?.id);
    },
    onError: (error) => {
      console.error('[useUpdateIssue] Failed to update issue:', error);
    },
  });
}
