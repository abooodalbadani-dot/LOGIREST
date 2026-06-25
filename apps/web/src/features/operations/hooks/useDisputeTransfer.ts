'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { toast } from 'sonner';
import { z } from 'zod';

const DisputedLineSchema = z.object({
  lineId: z.string(),
  receivedQty: z.number(),
});

const DisputePayloadSchema = z.object({
  version: z.number(),
  comments: z.string().min(1, 'Comments are required for a dispute'),
  disputedLines: z.array(DisputedLineSchema),
});

type DisputePayload = z.infer<typeof DisputePayloadSchema>;

export function useDisputeTransfer(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, body, signal, headers }: { id: string; body: DisputePayload; signal?: AbortSignal; headers?: Record<string, string> }) =>
      apiClient.post(`/operations/transfers/${id}/dispute`, successSchema, DisputePayloadSchema.parse(body), { signal, headers, isRetry: true }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfers', id] });
      queryClient.invalidateQueries({ queryKey: ['transfers', 'summary'] });
    },
    onError: (error) => {
      console.error('Failed to dispute transfer:', error);
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    }
  });
}
