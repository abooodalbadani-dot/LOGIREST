'use client';
import { useTranslations } from 'next-intl';
import type { WarehouseLockState } from '@/types/stocktake';
import { Lock, AlertCircle } from 'lucide-react';

export function LockBanner({ lockState }: { lockState: WarehouseLockState | undefined }) {
 const t = useTranslations('operations.stocktake');
 const tc = useTranslations('common');
 
 if (!lockState?.isLocked) return null;
 
 const startTime = lockState.lockStartedAt ? new Date(lockState.lockStartedAt).toLocaleString() : '';

 return (
 <div className="w-full bg-status-warning/10 sm:rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-700 relative overflow-hidden group backdrop-blur-md">
 {/* Visual background element */}
 <div className="absolute inset-0 bg-gradient-to-r from-status-warning/10 to-transparent pointer-events-none" />
 
 <div className="flex items-center gap-4 w-full sm:w-auto relative z-10">
 <div className="flex shrink-0 items-center justify-center h-12 w-12 rounded-xl bg-status-warning/20 text-status-warning">
 <Lock className="h-5 w-5" />
 </div>
 <div className="flex flex-col gap-0.5">
 <span className="font-semibold text-status-warning uppercase text-label-xs">
 {t('warehouse_locked_banner', { sessionNumber: lockState.sessionNumber || 'N/A' })}
 </span>
 <span className="text-status-warning/80 text-label-sm font-bold leading-relaxed">
 {startTime ? (
 <span className="flex items-center gap-1.5">
 {tc('lockedAt') || 'Locked at'}: <span dir="ltr" className="font-mono font-semibold bg-status-warning/20 px-2 py-0.5 rounded-lg text-label-xs">{startTime}</span>
 </span>
 ) : (
 tc('stocktakeInProgressDesc') || "Transactions are restricted due to an active stocktake."
 )}
 </span>
 </div>
 </div>
 <div className="flex shrink-0 items-center gap-3 relative z-10">
 <div className="h-8 w-[1px] bg-status-warning/30 hidden sm:block mx-2" />
 <div className="bg-status-warning/15 p-2.5 rounded-xl text-status-warning animate-pulse">
 <AlertCircle className="h-5 w-5" />
 </div>
 </div>
 </div>
 );
}
