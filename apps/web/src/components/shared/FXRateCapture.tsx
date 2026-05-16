'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

import { useAbortController } from '@/hooks/useAbortController';

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
 const abortController = useAbortController();
 
 useEffect(() => {
 if (defaultRate) return;
 
 const fetchRate = async () => {
 try {
 const response = await apiClient.get(
 `/currencies/fx-rates?from=${fromCurrencyCode}&to=${toCurrencyCode}`,
 z.object({ data: FxRateSchema }),
 { signal: abortController.signal }
 );
 setRate(response.data.rate);
 setIsLoading(false);
 } catch (_) {
 setIsLoading(false);
 }
 };
 
 fetchRate();
 }, [defaultRate, fromCurrencyCode, toCurrencyCode, abortController]);

 const numericRate = Number(rate);
 const isValid = numericRate > 0;

 return (
 <div className="bg-surface-container-lowest border border-transparent rounded-2xl p-6">
 <h3 className="text-title-sm font-bold text-foreground mb-4 flex items-center gap-2">
 <div className="w-1.5 h-6 bg-operational-cyan rounded-full" />
 {t('fx_capture_title')}
 </h3>
 
 <div className="flex flex-col gap-5">
 <div className="flex items-center gap-3">
 <span className="font-mono text-muted-foreground bg-surface-container-lowest px-4 py-3 rounded-xl border border-outline-low text-body-md">
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
 className="flex-1 bg-surface-container-lowest border border-outline-low text-foreground rounded-xl px-4 py-3 focus:border-operational-cyan focus:ring-1 focus:ring-operational-cyan/50 outline-none font-mono text-title-sm shadow-inner transition-all"
 />
 <span className="font-mono text-muted-foreground bg-surface-container-lowest px-4 py-3 rounded-xl border border-outline-low text-body-md">
 {toCurrencyCode}
 </span>
 </div>
 
 <div className="text-label-sm text-status-warning bg-status-warning/10 border border-status-warning/20 rounded-xl p-4 flex items-start gap-3">
 <div className="w-1 h-1 rounded-full bg-status-warning mt-1.5 shrink-0" />
 <p className="leading-relaxed opacity-90">
 {t('fx_permanent_warning')}
 </p>
 </div>
 
 <div className="flex justify-end mt-2">
 <button 
 onClick={() => onRateConfirmed(numericRate)}
 disabled={!isValid || isLoading}
 className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl disabled:opacity-50 transition-all hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:brightness-110 active:scale-[0.98] flex items-center gap-2"
 >
 {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
 {tCommon('confirm_rate') || 'تأكيد السعر'}
 </button>
 </div>
 </div>
 </div>
 );
}
