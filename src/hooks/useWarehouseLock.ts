'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import type { WarehouseLockState } from '@/types/stocktake';

const LockSchema = z.object({
 is_locked: z.boolean(),
 session_id: z.string().nullable(),
 session_number: z.string().nullable(),
 lock_started_at: z.string().nullable(),
});

export function useWarehouseLock(warehouseId: string | null) {
 return useQuery<WarehouseLockState>({
 queryKey: ['warehouse-lock', warehouseId],
 queryFn: () => apiClient.get(`/inventory/warehouses/${warehouseId}/lock`, LockSchema),
 staleTime: 30_000,
 enabled: !!warehouseId,
 });
}
