'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { toast } from 'sonner';
import { PODetailSchema } from './usePO';
import { invalidatePOQueries, invalidatePRQueries } from '@/lib/react-query/invalidation';

const CreatePOPayloadSchema = z.object({
 prId: z.string().optional(),
 targetWarehouseId: z.string().optional(),
 supplierId: z.string(),
 currencyId: z.string(),
 exchangeRate: z.number(),
 expectedDate: z.string(),
 isSubmitted: z.boolean().optional(),
 notes: z.string().nullable().optional().or(z.literal('')),
 lines: z.array(z.object({
  itemId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  uomId: z.string(),
  notes: z.string().nullable().optional().or(z.literal(''))
 }))
});

export type CreatePOPayload = z.infer<typeof CreatePOPayloadSchema>;

export function useCreatePO(options?: { onConflict?: () => void, messages?: { successMessage?: string } }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ payload, signal }: { payload: CreatePOPayload; signal?: AbortSignal }) => 
   apiClient.post('/procurement/purchase-orders', z.object({ data: PODetailSchema }), CreatePOPayloadSchema.parse(payload), { signal }).then(res => res.data),
  onSuccess: (data: { id: string }) => {
   queryClient.setQueryData(['purchase-orders', data.id], data);
   invalidatePOQueries(queryClient, data.id);
   invalidatePRQueries(queryClient);
   toast.success(options?.messages?.successMessage || 'Purchase order created successfully');
  },
  onError: (_error: unknown) => {
   // Handled globally by useSafeMutation
  },
 });
}
