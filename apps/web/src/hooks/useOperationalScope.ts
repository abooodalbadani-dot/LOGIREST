'use client';

import { useAuth } from '@/providers/AuthProvider';

export interface OperationalScope {
  warehouseId: string | null;
  branchId: string | null;
}

/**
 * Hook that reads the active operational scope (warehouseId, branchId)
 * from AuthProvider. Used by all operational list hooks to scope queries.
 *
 * - For WH_KEEPER/STORE_MGR: warehouseId is set, data is scoped
 * - For ADMIN/INV_MGR: warehouseId may be null, meaning "see all"
 * - When warehouseId is null and role requires scope, list screens show empty state
 */
export function useOperationalScope(): OperationalScope {
  const { activeScope } = useAuth();
  return {
    warehouseId: activeScope.warehouseId,
    branchId: activeScope.branchId,
  };
}