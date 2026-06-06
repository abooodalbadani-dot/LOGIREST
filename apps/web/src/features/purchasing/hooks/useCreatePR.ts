'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { PRDetailSchema } from './usePR';

const CreatePRPayloadSchema = z.object({
  branchId: z.string(),
  warehouseId: z.string(),
  notes: z.string().optional().or(z.literal('')),
  lines: z.array(z.object({
    itemId: z.string(),
    quantity: z.number().positive(),
  }))
});

export type CreatePRPayload = z.infer<typeof CreatePRPayloadSchema>;

export function useCreatePR(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: (payload: CreatePRPayload & { signal?: AbortSignal }) => {
      const { signal, ...data } = payload;
      return apiClient.post('/procurement/purchase-requests', PRDetailSchema, CreatePRPayloadSchema.parse(data), { signal });
    },
    onSuccess: (data) => {
      // Seed the cache for the newly created PR
      queryClient.setQueryData(['purchase-requests', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'Aborted') return;
    }
  });
}
