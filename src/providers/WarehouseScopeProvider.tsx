'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import type { WarehouseLockState } from '@/types/stocktake';

interface WarehouseScopeContextValue {
 isLocked: boolean;
 lockState: WarehouseLockState | undefined;
 isLoading: boolean;
}

const WarehouseScopeContext = createContext<WarehouseScopeContextValue | null>(null);

export function WarehouseScopeProvider({ children }: { children: ReactNode }) {
 const { activeScope } = useAuth();
 const { data: lockState, isLoading } = useWarehouseLock(activeScope.warehouseId);

 const value: WarehouseScopeContextValue = {
 isLocked: lockState?.is_locked ?? false,
 lockState,
 isLoading
 };

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
