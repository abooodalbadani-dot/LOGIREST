'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { PRDetailSchema } from './usePR';

const CreatePRPayloadSchema = z.object({
 department_id: z.string(),
 expected_date: z.string(),
 notes: z.string().optional(),
 lines: z.array(z.object({
 item_id: z.string(),
 req_qty: z.number().positive(),
 uom_id: z.string()
 }))
});

export type CreatePRPayload = z.infer<typeof CreatePRPayloadSchema>;

export function useCreatePR(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: (payload: CreatePRPayload & { signal?: AbortSignal }) => {
      const { signal, ...data } = payload;
      return apiClient.post('/procurement/purchase-requests', PRDetailSchema, CreatePRPayloadSchema.parse(data), signal);
    },
    onSuccess: (data) => {
      // Seed the cache for the newly created PR
      queryClient.setQueryData(['purchase-request', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'Aborted') return;
    }
  });
}
