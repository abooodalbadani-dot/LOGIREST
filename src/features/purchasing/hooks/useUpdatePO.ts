'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { PODetailSchema } from './usePO';

const UpdatePOPayloadSchema = z.object({
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

export type UpdatePOPayload = z.infer<typeof UpdatePOPayloadSchema>;

export function useUpdatePO(id: string) {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: (payload: UpdatePOPayload) => 
 apiClient.put(`/procurement/purchase-orders/${id}`, z.object({ data: PODetailSchema }), UpdatePOPayloadSchema.parse(payload)).then(res => res.data),
 onSuccess: (data) => {
 // Update cache
 queryClient.setQueryData(['purchase-order', id], data);
 queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
 }
 });
}
