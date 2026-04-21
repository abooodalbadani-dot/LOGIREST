'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const FxRateSchema = z.object({
  rate: z.number()
});

interface FXRateCaptureProps {
  fromCurrencyCode: string;
  toCurrencyCode: string;
  defaultRate?: number;
  onRateConfirmed: (rate: number) => void;
}

export function FXRateCapture({ fromCurrencyCode, toCurrencyCode, defaultRate, onRateConfirmed }: FXRateCaptureProps) {
  const t = useTranslations('procurement.grn');
  const tCommon = useTranslations('common');
  const [rate, setRate] = useState<number | ''>(defaultRate || '');
  const [isLoading, setIsLoading] = useState(!defaultRate);
  
  useEffect(() => {
    if (defaultRate) return;
    
    let isMounted = true;
    const fetchRate = async () => {
      try {
        const response = await apiClient.get(
          `/currencies/fx-rates?from=${fromCurrencyCode}&to=${toCurrencyCode}`,
          z.object({ data: FxRateSchema })
        );
        if (isMounted) {
          setRate(response.data.rate);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchRate();
    
    return () => { isMounted = false; };
  }, [defaultRate, fromCurrencyCode, toCurrencyCode]);

  const numericRate = Number(rate);
  const isValid = numericRate > 0;

  return (
    <div className="bg-surface-2 border border-surface-3 rounded p-4">
      <h3 className="font-bold text-on-surface mb-4">
        {t('fx_capture_title') || 'سعر الصرف عند الترحيل'}
      </h3>
      
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-on-surface-muted bg-surface-3 px-3 py-2 rounded">
            1 {fromCurrencyCode} =
          </span>
          <input 
            dir="ltr"
            type="number"
            min="0.0001"
            step="0.0001"
            value={rate}
            onChange={(e) => {
              const val = e.target.value;
              setRate(val === '' ? '' : Number(val));
            }}
            disabled={isLoading}
            className="flex-1 bg-surface-1 border border-surface-4 text-on-surface rounded p-2 focus:border-neon-cyan outline-none font-mono"
          />
          <span className="font-mono text-on-surface-muted bg-surface-3 px-3 py-2 rounded">
            {toCurrencyCode}
          </span>
        </div>
        
        <div className="text-sm text-neon-amber bg-neon-amber/10 border border-neon-amber/20 rounded p-2">
          {t('fx_permanent_warning') || 'سيُحفظ هذا السعر مع الوثيقة ولا يمكن تغييره لاحقاً.'}
        </div>
        
        <div className="flex justify-end">
          <button 
            onClick={() => onRateConfirmed(numericRate)}
            disabled={!isValid || isLoading}
            className="px-4 py-2 bg-neon-cyan text-surface-0 font-medium rounded disabled:opacity-50 transition-colors hover:bg-neon-cyan/80"
          >
            {tCommon('confirm_rate') || 'تأكيد السعر'}
          </button>
        </div>
      </div>
    </div>
  );
}
