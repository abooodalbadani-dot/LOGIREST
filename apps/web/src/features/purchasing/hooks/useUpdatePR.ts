'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { PRDetailSchema } from './usePR';

const UpdatePRPayloadSchema = z.object({
 version: z.number(),
 branchId: z.string().optional().nullable(),
 warehouseId: z.string().optional().nullable(),
 departmentId: z.string().optional().nullable(),
 notes: z.string().optional().nullable().or(z.literal('')),
 expectedDate: z.string().optional().nullable(),
 lines: z.array(z.object({
  id: z.string().optional().nullable(),
  itemId: z.string(),
  uomId: z.string().optional().nullable(),
  quantity: z.number(),
 })).optional()
});

export type UpdatePRPayload = z.infer<typeof UpdatePRPayloadSchema>;

export function useUpdatePR(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ id, payload, signal }: { id: string; payload: UpdatePRPayload; signal?: AbortSignal }) => 
   apiClient.put(`/procurement/purchase-requests/${id}`, z.object({ data: PRDetailSchema }), UpdatePRPayloadSchema.parse(payload), { signal }).then(r => r.data),
  onSuccess: (data) => {
   // Update individual PR cache with the returned data
   queryClient.setQueryData(['purchase-requests', data.id], data);
   
   queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
   queryClient.invalidateQueries({ queryKey: ['purchase-requests', data.id] });
  },
  onError: (error) => {
   const msg = error instanceof Error ? error.message : JSON.stringify(error);
   console.error('[useUpdatePR] Failed to update PR details:', msg, error);
  }
 });
}

