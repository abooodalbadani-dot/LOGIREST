'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export const LotAvailableSchema = z.object({
  id: z.string(),
  lot_number: z.string(),
  expiry_date: z.string().nullable(),
  total_qty: z.number(),
  item_id: z.string()
});

export type LotAvailable = z.infer<typeof LotAvailableSchema>;

export function useLotsByItem({ item_id, warehouse_id }: { item_id?: string; warehouse_id?: string }) {
  return useQuery({
    queryKey: ['lots-available', { item_id, warehouse_id }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (item_id) qs.append('item_id', item_id);
      if (warehouse_id) qs.append('warehouse_id', warehouse_id);
      
      const res = await apiClient.get(`/operations/lots-available?${qs.toString()}`, z.object({
        data: z.array(LotAvailableSchema)
      }));
      return res.data;
    },
    enabled: !!item_id && !!warehouse_id
  });
}
