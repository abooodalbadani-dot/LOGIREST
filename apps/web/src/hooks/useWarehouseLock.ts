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
    queryFn: async ({ signal }) => {
      try {
        return await apiClient.get(`/inventory/warehouses/${warehouseId}/lock`, LockSchema, { signal, skipAutoToast: true });
      } catch (err) {
        console.warn('Silent degradation: Failed to fetch warehouse lock status:', err);
        return {
          isLocked: false,
          sessionId: null,
          sessionNumber: null,
          lockStartedAt: null,
        };
      }
    },
    staleTime: 30_000,
    enabled: !!warehouseId,
  });

  const { router } = useUnsavedChangesGuard();

  return {
    ...query,
    guardedRouter: router,
  };
}
