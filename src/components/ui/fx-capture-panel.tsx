import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';
import { Label } from './label';
import { Input } from './input';
import { Calculator, Lock } from 'lucide-react';

interface FXCapturePanelProps {
  supplierCurrency: string;
  baseCurrency?: string;
  supplierTotal: number;
  initialRate: number;
  readOnly?: boolean;
  onRateChange?: (rate: number, baseTotal: number) => void;
}

export function FXCapturePanel({
  supplierCurrency,
  baseCurrency = 'SAR', /* System base currency */
  supplierTotal,
  initialRate,
  readOnly = false,
  onRateChange,
}: FXCapturePanelProps) {
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
    <Card className="border border-surface-2 bg-surface-1/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {readOnly ? (
            <Lock className="w-5 h-5 text-brand-primary" />
          ) : (
            <Calculator className="w-5 h-5 text-text-secondary" />
          )}
          <CardTitle className="text-base text-text-primary">
            {readOnly ? 'سعر الصرف المثبَّت للعملية' : 'تثبيت سعر الصرف'}
          </CardTitle>
        </div>
        {!readOnly && (
          <CardDescription className="text-text-tertiary">
            يرجى مراجعة وتثبيت سعر الصرف الفعلي قبل النقل إلى دفتر الأستاذ (Ledger).
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-text-secondary">إجمالي المورد ({supplierCurrency})</Label>
            <div className="h-10 px-3 bg-surface-2 rounded-md flex items-center border border-surface-2 opacity-70" dir="ltr">
              <span className="text-text-primary font-mono ml-auto">
                {supplierTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-text-secondary">
              سعر الصرف (1 {supplierCurrency} = ? {baseCurrency})
            </Label>
            {readOnly ? (
              <div className="h-10 px-3 bg-surface-2 rounded-md flex items-center border border-surface-2 opacity-70" dir="ltr">
                <span className="text-text-primary font-mono ml-auto">
                  {exchangeRate.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                </span>
              </div>
            ) : (
              <Input
                type="number"
                min="0.0001"
                step="0.0001"
                value={exchangeRate || ''}
                onChange={handleRateChange}
                dir="ltr"
                className="font-mono text-right"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-text-secondary font-semibold text-brand-primary">
              الإجمالي المعتمد ({baseCurrency})
            </Label>
            <div className="h-10 px-3 bg-brand-primary/10 rounded-md flex items-center border border-brand-primary/20" dir="ltr">
              <span className="text-brand-primary font-mono font-bold ml-auto text-lg">
                {baseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
