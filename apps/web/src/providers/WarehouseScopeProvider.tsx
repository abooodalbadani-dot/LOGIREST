'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import type { WarehouseLockState } from '@/types/stocktake';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface WarehouseScopeContextValue {
  isLocked: boolean;
  lockState: WarehouseLockState | undefined;
  isLoading: boolean;
}

const WarehouseScopeContext = createContext<WarehouseScopeContextValue | null>(null);

export function WarehouseScopeProvider({ children }: { children: ReactNode }) {
  const { user, activeScope, isLoading: authLoading } = useAuth();

  // Guard the hook argument and loading check
  const warehouseId = activeScope?.warehouseId;
  const { data: lockState, isLoading: lockLoading } = useWarehouseLock(warehouseId ?? null);

  const scopeNotResolved = !!user && (!activeScope?.branchId || !activeScope?.warehouseId);
  const isLoadingCombined = authLoading || scopeNotResolved || (!!warehouseId && lockLoading);

  const value: WarehouseScopeContextValue = {
    isLocked: lockState?.isLocked ?? false,
    lockState,
    isLoading: isLoadingCombined,
  };

  if (isLoadingCombined) {
    return <LoadingSpinner />;
  }

  return (
    <WarehouseScopeContext.Provider value={value}>
      {children}
    </WarehouseScopeContext.Provider>
  );
}

export const useWarehouseScope = () => {
  const context = useContext(WarehouseScopeContext);
  if (!context) throw new Error('useWarehouseScope must be used within WarehouseScopeProvider');
  return context;
};
