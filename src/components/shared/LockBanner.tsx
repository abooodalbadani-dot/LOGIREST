'use client';
import { useTranslations } from 'next-intl';
import type { WarehouseLockState } from '@/types/stocktake';

export function LockBanner({ lockState }: { lockState: WarehouseLockState | undefined }) {
  const t = useTranslations('operations.stocktake');
  
  if (!lockState?.is_locked) return null;
  
  const startTime = lockState.lock_started_at ? new Date(lockState.lock_started_at).toLocaleString() : '';

  return (
    <div role="alert" className="bg-neon-amber/15 border border-neon-amber/40 rounded p-3 mb-4 flex items-start gap-3">
      <div className="text-neon-amber mt-0.5">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
        </svg>
      </div>
      <div className="text-sm text-neon-amber">
        <p className="font-bold">
          {t('warehouse_locked_banner', { sessionNumber: lockState.session_number || 'N/A' })}
        </p>
        {startTime && <p className="opacity-80 mt-1">Locked at: <span dir="ltr">{startTime}</span></p>}
      </div>
    </div>
  );
}
