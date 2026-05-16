'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { PODetailSchema } from './usePO';

const CreatePOPayloadSchema = z.object({
 pr_id: z.string().optional(),
 target_warehouse_id: z.string().optional(),
 supplier_id: z.string(),
 currency_code: z.string(),
 exchange_rate: z.number(),
 expected_date: z.string(),
 notes: z.string().optional(),
 lines: z.array(z.object({
 item_id: z.string(),
 quantity: z.number().positive(),
 unit_price: z.number().nonnegative(),
 uom_id: z.string(),
 notes: z.string().optional()
 }))
});

export type CreatePOPayload = z.infer<typeof CreatePOPayloadSchema>;

export function useCreatePO(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
 onConflict: options?.onConflict,
 mutationFn: ({ payload, signal }: { payload: CreatePOPayload; signal?: AbortSignal }) => 
 apiClient.post('/procurement/purchase-orders', z.object({ data: PODetailSchema }), CreatePOPayloadSchema.parse(payload), { signal }).then(res => res.data),
 onSuccess: (data) => {
 // Seed the cache for the newly created PO
 queryClient.setQueryData(['purchase-order', data.id], data);
 queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
 }
 });
}
