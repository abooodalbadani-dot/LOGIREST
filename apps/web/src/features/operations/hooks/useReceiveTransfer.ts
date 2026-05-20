'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { toast } from 'sonner';
import { z } from 'zod';

const LotReceiveSchema = z.object({
  lot_id: z.string(),
  received_qty: z.number(),
});

const ReceiveLineSchema = z.object({
 line_id: z.string(),
 received_qty: z.number(),
 lot_receives: z.array(LotReceiveSchema).optional(),
});

const ReceivePayloadSchema = z.object({
  version: z.number(),
  lines: z.array(ReceiveLineSchema),
  confirmation: z.string(),
  variance_reason: z.string().optional(),
});

type ReceivePayload = z.infer<typeof ReceivePayloadSchema>;

export function useReceiveTransfer(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, body, signal, headers }: { id: string; body: ReceivePayload; signal?: AbortSignal; headers?: Record<string, string> }) =>
      apiClient.post(`/operations/transfers/${id}/receive`, successSchema, ReceivePayloadSchema.parse(body), { signal, headers }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfers', id] });
    },
    onError: (error) => {
      console.error('Failed to receive transfer:', error);
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    }
  });
}
