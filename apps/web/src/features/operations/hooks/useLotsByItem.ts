'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { LotSchema, type Lot } from '@/types/master-data';

export function useLotsByItem({ itemId, warehouseId }: { itemId?: string; warehouseId?: string }) {
 return useQuery({
  queryKey: ['lots-available', { itemId, warehouseId }],
  queryFn: async ({ signal }) => {
   const qs = new URLSearchParams();
   if (itemId) qs.append('itemId', itemId);
   if (warehouseId) qs.append('warehouseId', warehouseId);
   
   const res = await apiClient.get(`/operations/lots-available?${qs.toString()}`, z.object({
    data: z.array(z.object({
     id: z.string(),
     itemId: z.string().optional(),
     lotNumber: z.string().optional(),
     expiryDate: z.string().nullable().optional(),
     totalQty: z.number().optional(),
     qtyAvailable: z.number().optional(),
     isExpired: z.boolean().optional(),
     isNearExpiry: z.boolean().optional(),
    }))
   }), { signal });

   return res.data.map((item) => {
    const lot: Lot = {
     id: item.id,
     itemId: item.itemId || itemId || '',
     warehouseId: warehouseId || '',
     lotNumber: item.lotNumber || item.id,
     expiryDate: item.expiryDate || null,
     qtyAvailable: item.totalQty ?? item.qtyAvailable ?? 0,
     isExpired: item.isExpired ?? false,
     isNearExpiry: item.isNearExpiry ?? false,
    };
    return LotSchema.parse(lot);
   });
  },
  enabled: !!itemId && !!warehouseId
 });
}
