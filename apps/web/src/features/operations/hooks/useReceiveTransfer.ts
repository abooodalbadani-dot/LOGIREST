'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { toast } from 'sonner';
import { invalidateTransferQueries, invalidateInventoryQueries } from '@/lib/react-query/invalidation';
import { z } from 'zod';

const ReceiveLineSchema = z.object({
 lineId: z.string(),
 quantityReceived: z.number(),
 varianceReason: z.string().optional(),
});

const ReceivePayloadSchema = z.object({
 version: z.number(),
 linesReceived: z.array(ReceiveLineSchema),
});

type ReceivePayload = z.infer<typeof ReceivePayloadSchema>;

export function useReceiveTransfer(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ id, body, signal, headers }: { id: string; body: ReceivePayload; signal?: AbortSignal; headers?: Record<string, string> }) =>
   apiClient.post(`/operations/transfers/${id}/receive`, successSchema, ReceivePayloadSchema.parse(body), { signal, headers, isRetry: true }),
  onSuccess: (_, { id }) => {
   invalidateTransferQueries(queryClient, id);
   invalidateInventoryQueries(queryClient);
  },
  onError: (error) => {
   console.error('Failed to receive transfer:', error);
   const message = error instanceof Error ? error.message : 'Operation failed';
   toast.error(message);
  }
 });
}
