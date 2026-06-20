'use client';
import { useTranslations, useLocale } from 'next-intl';
import type { WarehouseLockState } from '@/types/stocktake';
import { Lock } from 'lucide-react';
import { formatDate } from '@/utils/currency';

export function LockBanner({ lockState }: { lockState: WarehouseLockState | undefined }) {
  const t = useTranslations('operations.stocktake');
  const tc = useTranslations('common');
  const locale = useLocale() as 'ar' | 'en';
  
  if (!lockState?.isLocked) return null;
  
  const startTime = formatDate(lockState.lockStartedAt, locale);

  return (
    <div className="bg-orange-950/30 border border-orange-900/50 rounded-xl p-4 flex flex-row items-center justify-start gap-4 w-full mb-6">
      <div className="shrink-0 flex items-center justify-center h-12 w-12 rounded-lg bg-orange-900/30 text-orange-500">
        <Lock className="h-6 w-6" />
      </div>
      <div className="flex flex-col text-start">
        <span className="font-semibold text-orange-400 text-sm leading-tight">
          {t('warehouse_locked_banner', { sessionNumber: lockState.sessionNumber || tc('not_available') })}
        </span>
        <span className="text-orange-500/80 text-xs mt-1">
          {startTime ? (
            <span className="flex items-center gap-1.5">
              {t('locked_at')}: <span dir="ltr" className="font-mono">{startTime}</span>
            </span>
          ) : (
            t('stocktake_in_progress_desc')
          )}
        </span>
      </div>
    </div>
  );
}
