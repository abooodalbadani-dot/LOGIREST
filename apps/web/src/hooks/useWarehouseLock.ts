'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import type { WarehouseLockState } from '@/types/stocktake';

const LockSchema = z.object({
  isLocked: z.boolean(),
  sessionId: z.string().nullable(),
  sessionNumber: z.string().nullable(),
  lockStartedAt: z.string().nullable(),
});

import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';

export function useWarehouseLock(warehouseId: string | null) {
 const query = useQuery<WarehouseLockState>({
 queryKey: ['warehouse-lock', warehouseId],
 queryFn: () => apiClient.get(`/inventory/warehouses/${warehouseId}/lock`, LockSchema),
 staleTime: 30_000,
 enabled: !!warehouseId,
 });

 const { router } = useUnsavedChangesGuard();

 return {
   ...query,
   guardedRouter: router,
 };
}

<<<<<<< HEAD:src/hooks/useWarehouseLock.ts
=======

>>>>>>> 002-frontend-baseline:apps/web/src/hooks/useWarehouseLock.ts
