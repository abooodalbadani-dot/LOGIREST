'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { toast } from 'sonner';
import { StockIssueDetailSchema } from './useIssue';

export const CreateIssueLineAllocationSchema = z.object({
 lotNumber: z.string(),
 allocatedQty: z.number(),
});

export const CreateIssueLineSchema = z.object({
 itemId: z.string().min(1),
 requestedQty: z.number().positive(),
 lotAllocations: z.array(CreateIssueLineAllocationSchema),
 notes: z.string().optional(),
});

export const CreateIssuePayloadSchema = z.object({
 warehouseId: z.string().min(1),
 destinationDeptId: z.string().min(1),
 lines: z.array(CreateIssueLineSchema).min(1),
 notes: z.string().optional(),
 kitchenRequestId: z.string().optional(),
});

export type CreateIssuePayload = z.infer<typeof CreateIssuePayloadSchema>;

export function useCreateIssue(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();

 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ signal, ...data }: CreateIssuePayload & { signal?: AbortSignal }) =>
   apiClient.post(
    '/operations/issues',
    StockIssueDetailSchema,
    CreateIssuePayloadSchema.parse(data),
    { signal }
   ),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['issues'] });
  },
  onError: (error: unknown) => {
   const message = error instanceof Error ? error.message : 'Operation failed';
   toast.error(message);
  },
 });
}
