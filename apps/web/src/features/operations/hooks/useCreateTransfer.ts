'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { toast } from 'sonner';
import { TransferDetailSchema } from './useTransfer';

const LotAllocationSchema = z.object({
  lotId: z.string(),
  qty: z.number().positive()
});

const CreateTransferPayloadSchema = z.object({
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  notes: z.string().optional().or(z.literal('')),
  lines: z.array(z.object({
    itemId: z.string(),
    quantityShipped: z.number().positive(),
    uomId: z.string().optional(),
    lotAllocations: z.array(LotAllocationSchema).optional()
  }))
});

export type CreateTransferPayload = z.infer<typeof CreateTransferPayloadSchema>;

export function useCreateTransfer(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
 onConflict: options?.onConflict,
 mutationFn: ({ payload, signal, headers }: { payload: CreateTransferPayload; signal?: AbortSignal; headers?: Record<string, string> }) => 
 apiClient.post('/operations/transfers', TransferDetailSchema, CreateTransferPayloadSchema.parse(payload), { signal, headers }),
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['transfers'] });
  queryClient.invalidateQueries({ queryKey: ['transfers', 'summary'] });
  },
  onError: (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Operation failed';
    toast.error(message);
  },
  });
}
