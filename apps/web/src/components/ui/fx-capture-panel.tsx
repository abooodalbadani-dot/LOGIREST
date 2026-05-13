import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';
import { Label } from './label';
import { Input } from './input';
import { Calculator, Lock } from 'lucide-react';
import { useAdminSettings } from '@/features/admin/hooks/useAdminSettings';
import { formatNumber } from '@/utils/currency';

interface FXCapturePanelProps {
  supplierCurrency: string;
  supplierTotal: number;
  initialRate: number;
  readOnly?: boolean;
  onRateChange?: (rate: number, baseTotal: number) => void;
}

export function FXCapturePanel({
  supplierCurrency,
  supplierTotal,
  initialRate,
  readOnly = false,
  onRateChange,
}: FXCapturePanelProps) {
  const t = useTranslations('procurement.fx_panel');
  const locale = useLocale() as 'ar' | 'en';
  const { data: settings } = useAdminSettings();
  const baseCurrency = settings?.base_currency || 'SAR';
  
  const [exchangeRate, setExchangeRate] = useState<number>(initialRate);
  
  const baseTotal = supplierTotal * exchangeRate;

  useEffect(() => {
    if (onRateChange) {
      onRateChange(exchangeRate, baseTotal);
    }
  }, [exchangeRate, baseTotal, onRateChange]);

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    if (!isNaN(rate) && rate > 0) {
      setExchangeRate(rate);
    } else if (e.target.value === '') {
      setExchangeRate(0);
    }
  };

  return (
    <Card className="border bg-surface-container-low/50 rounded-xl overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {readOnly ? (
            <Lock className="w-5 h-5 text-operational-cyan" />
          ) : (
            <Calculator className="w-5 h-5 text-muted-foreground/80" />
          )}
          <CardTitle className="text-title-sm text-foreground">
            {readOnly ? t('fixed_rate_title') : t('capture_rate_title')}
          </CardTitle>
        </div>
        {!readOnly && (
          <CardDescription className="text-muted-foreground/60">
            {t('capture_rate_description')}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground/80">{t('supplier_total', { currency: supplierCurrency })}</Label>
            <div className="h-10 px-3 bg-surface-container-high rounded-xl flex items-center border opacity-70" dir="ltr">
              <span className="text-foreground font-mono me-auto">
                {formatNumber(supplierTotal, locale, 2)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground/80">
              {t('exchange_rate_label', { from: supplierCurrency, to: baseCurrency })}
            </Label>
            {readOnly ? (
              <div className="h-10 px-3 bg-surface-container-high rounded-xl flex items-center border opacity-70" dir="ltr">
                <span className="text-foreground font-mono me-auto">
                  {formatNumber(exchangeRate, locale, 4)}
                </span>
              </div>
            ) : (
              <Input
                type="number"
                min="0.0001"
                step="0.0001"
                value={exchangeRate || ''} onChange={handleRateChange}
                dir="ltr"
                className="font-mono text-end"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground/80 font-semibold text-operational-cyan">
              {t('base_total_label', { currency: baseCurrency })}
            </Label>
            <div className="h-10 px-3 bg-operational-cyan/10 rounded-xl flex items-center border border-operational-cyan/20" dir="ltr">
              <span className="text-operational-cyan font-mono font-bold me-auto text-title-sm">
                {formatNumber(baseTotal, locale, 2)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
