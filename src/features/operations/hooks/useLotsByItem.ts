'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { LotSchema, type Lot } from '@/types/master-data';

interface RawLotItem {
  id: string;
  item_id: string;
  lot_number: string;
  expiry_date: string;
  total_qty?: number;
  qty_available?: number;
  is_expired?: boolean;
  is_near_expiry?: boolean;
}

export function useLotsByItem({ item_id, warehouse_id }: { item_id?: string; warehouse_id?: string }) {
  return useQuery({
    queryKey: ['lots-available', { item_id, warehouse_id }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (item_id) qs.append('item_id', item_id);
      if (warehouse_id) qs.append('warehouse_id', warehouse_id);
      
      const res = await apiClient.get(`/operations/lots-available?${qs.toString()}`, z.object({
        data: z.array(z.object({
          id: z.string(),
          item_id: z.string(),
          lot_number: z.string(),
          expiry_date: z.string(),
          total_qty: z.number().optional(),
          qty_available: z.number().optional(),
          is_expired: z.boolean().optional(),
          is_near_expiry: z.boolean().optional(),
        }))
      }));

      return res.data.map((item) => {
        const lot: Lot = {
          id: item.id,
          item_id: item.item_id,
          warehouse_id: warehouse_id || '',
          lot_number: item.lot_number,
          expiry_date: item.expiry_date,
          qty_available: item.total_qty ?? item.qty_available ?? 0,
          is_expired: item.is_expired ?? false,
          is_near_expiry: item.is_near_expiry ?? false,
        };
        return LotSchema.parse(lot);
      });
    },
    enabled: !!item_id && !!warehouse_id
  });
}
