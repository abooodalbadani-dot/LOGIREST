'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { PRDetailSchema } from './usePR';

const CreatePRPayloadSchema = z.object({
 branchId: z.string(),
 warehouseId: z.string(),
 departmentId: z.string().optional(),
 notes: z.string().optional().or(z.literal('')),
 expectedDate: z.string().optional().nullable(),
 lines: z.array(z.object({
  id: z.string().optional(),
  itemId: z.string(),
  uomId: z.string().optional().nullable(),
  quantity: z.number().positive(),
 }))
});

export type CreatePRPayload = z.infer<typeof CreatePRPayloadSchema>;

export function useCreatePR(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ payload, signal, headers }: { payload: CreatePRPayload; signal?: AbortSignal; headers?: Record<string, string> }) =>
   apiClient.post('/procurement/purchase-requests', z.object({ data: PRDetailSchema }), CreatePRPayloadSchema.parse(payload), { signal, headers }).then(r => r.data),
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
