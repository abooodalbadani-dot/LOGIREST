'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { toast } from 'sonner';
import { StockIssueDetailSchema } from './useIssue';
import { invalidateIssueQueries, invalidateKitchenRequestQueries } from '@/lib/react-query/invalidation';

export const CreateIssueLineAllocationSchema = z.object({
 lotId: z.string().optional(),
 lotNumber: z.string(),
 expiryDate: z.string().optional().nullable(),
 allocatedQty: z.number().optional(),
 quantityAllocated: z.number().optional(),
});

export const CreateIssueLineSchema = z.object({
 requestedQty: z.number().positive(),
 itemId: z.string().min(1),
 uomId: z.string().optional(),
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
  onSuccess: (data: { id: string }) => {
   invalidateIssueQueries(queryClient, data?.id);
   invalidateKitchenRequestQueries(queryClient);
  },
  onError: (error: unknown) => {
   const message = error instanceof Error ? error.message : 'Operation failed';
   toast.error(message);
  },
 });
}
