'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { StockIssueDetailSchema, type StockIssueDetail } from './useIssue';
import { invalidateIssueQueries } from '@/lib/react-query/invalidation';

/**
 * Payload for the /submit transition call.
 * Intentionally minimal — data persistence is handled separately by useUpdateIssue.
 * This hook is ONLY responsible for the workflow status transition.
 */
export interface SubmitIssuePayload {
  id: string;
  /** Must be the version AFTER the update step to pass optimistic lock check. */
  version: number;
  signal?: AbortSignal;
}

export function useSubmitIssue(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();

  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, version, signal }: SubmitIssuePayload): Promise<StockIssueDetail> =>
      // Send ONLY version for the optimistic lock check.
      // The document data was already persisted by the preceding useUpdateIssue call.
      // The submit endpoint will skip its inline update block (no lines/notes sent)
      // and proceed directly to the workflow transition.
      apiClient.post<StockIssueDetail>(
        `/operations/issues/${id}/submit`,
        StockIssueDetailSchema,
        { version },
        { signal, isRetry: false }
      ),
    onSuccess: (data: StockIssueDetail) => {
      // The response is the server-confirmed submitted document.
      // Set it directly in cache — it has the correct lines (from the update step)
      // and the SUBMITTED status.
      queryClient.setQueryData(['issues', data.id], data);
      invalidateIssueQueries(queryClient, data.id);
    },
    onError: (error) => {
      console.error('[useSubmitIssue] Workflow transition failed:', error);
    },
  });
}
