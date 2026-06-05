'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { LotSchema, type Lot } from '@/types/master-data';

export function useLotsByItem({ item_id, warehouse_id }: { item_id?: string; warehouse_id?: string }) {
  return useQuery({
    queryKey: ['lots-available', { item_id, warehouse_id }],
    queryFn: async ({ signal }) => {
      const qs = new URLSearchParams();
      if (item_id) qs.append('item_id', item_id);
      if (warehouse_id) qs.append('warehouse_id', warehouse_id);
      
      const res = await apiClient.get(`/operations/lots-available?${qs.toString()}`, z.object({
        data: z.array(z.object({
          id: z.string(),
          itemId: z.string(),
          lotNumber: z.string(),
          expiryDate: z.string(),
          totalQty: z.number().optional(),
          qtyAvailable: z.number().optional(),
          isExpired: z.boolean().optional(),
          isNearExpiry: z.boolean().optional(),
        }))
      }), { signal });

      return res.data.map((item) => {
        const lot: Lot = {
          id: item.id,
          itemId: item.itemId,
          warehouseId: warehouse_id || '',
          lotNumber: item.lotNumber,
          expiryDate: item.expiryDate,
          qtyAvailable: item.totalQty ?? item.qtyAvailable ?? 0,
          isExpired: item.isExpired ?? false,
          isNearExpiry: item.isNearExpiry ?? false,
        };
        return LotSchema.parse(lot);
      });
    },
    enabled: !!item_id && !!warehouse_id
  });
}
