'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import type { WarehouseLockState } from '@/types/stocktake';
import { Loader2 } from 'lucide-react';

interface WarehouseScopeContextValue {
  isLocked: boolean;
  lockState: WarehouseLockState | undefined;
  isLoading: boolean;
}

const WarehouseScopeContext = createContext<WarehouseScopeContextValue | null>(null);

export function WarehouseScopeProvider({ children }: { children: ReactNode }) {
  const { activeScope, isLoading: authLoading } = useAuth();
  
  // Guard the hook argument and loading check
  const warehouseId = activeScope?.warehouseId;
  const { data: lockState, isLoading: lockLoading } = useWarehouseLock(warehouseId ?? null);

  const isLoadingCombined = authLoading || (!!warehouseId && lockLoading);

  const value: WarehouseScopeContextValue = {
    isLocked: lockState?.isLocked ?? false,
    lockState,
    isLoading: isLoadingCombined,
  };

  if (isLoadingCombined) {
    return (
      <div className="flex w-full items-center justify-center min-h-screen bg-[#050505]">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-operational-cyan" />
          <div className="absolute inset-0 blur-xl bg-operational-cyan/20 animate-pulse" />
        </div>
      </div>
    );
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
