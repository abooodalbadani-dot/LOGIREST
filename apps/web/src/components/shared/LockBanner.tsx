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
    <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-500/10 border border-#D4AF37 dark:border-orange-500/20 rounded-xl w-full mb-6">
      <Lock className="h-5 w-5 text-#D4AF37 shrink-0" />
      <div className="flex flex-col text-start">
        <span className="text-sm font-bold text-#D4AF37 dark:text-#D4AF37">
          {t('warehouse_locked_banner', { sessionNumber: lockState.sessionNumber || tc('not_available') })}
        </span>
        <span className="text-xs font-mono text-#D4AF37 dark:text-#D4AF37 [font-variant-numeric:lining-nums_tabular-nums] mt-0.5" dir="ltr">
          {startTime ? (
            <span className="flex items-center gap-1.5">
              {t('locked_at')}: <span>{startTime}</span>
            </span>
          ) : (
            t('stocktake_in_progress_desc')
          )}
        </span>
      </div>
    </div>
  );
}
