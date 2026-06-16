'use client';

import { LucideIcon } from 'lucide-react';
import { useCurrency } from '@/app/[locale]/providers/currency-provider';

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  accent: 'cyan' | 'amber' | 'red';
  description?: string;
  className?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  currency?: string;
  symbol?: string;
}

export function KPICard({ title, value, icon: Icon, accent, description, trend, className, currency: propCurrency, symbol: propSymbol }: KPICardProps) {
  const contextCurrency = useCurrency();
  const currency = propCurrency ?? contextCurrency.currency;
  const symbol = propSymbol ?? contextCurrency.symbol;
  const stringValue = String(value).replace(/,/g, '').replace(/[^\d.-]/g, '');
  const numericValue = parseFloat(stringValue);
  const isZero = !isNaN(numericValue) && numericValue === 0;

  const accentColors = {
    cyan: 'text-foreground',
    amber: isZero ? 'text-muted-foreground' : 'text-yellow-600 dark:text-yellow-500',
    red: isZero ? 'text-muted-foreground' : 'text-red-500',
  };

  const renderValue = () => {
    const valStr = String(value);
    const currencySymbol = symbol || 'USD';
    if (valStr.includes(currencySymbol)) {
      const parts = valStr.split(currencySymbol);
      return (
        <>
          {parts[0]}<span className="text-sm font-normal text-muted-foreground mx-1">{currencySymbol}</span>{parts[1]}
        </>
      );
    }
    const currencyCode = currency || 'USD';
    if (valStr.includes(currencyCode)) {
      const parts = valStr.split(currencyCode);
      return (
        <>
          {parts[0]}<span className="text-sm font-normal text-muted-foreground mx-1">{currencyCode}</span>{parts[1]}
        </>
      );
    }
    if (currencySymbol !== 'USD' && valStr.includes('USD')) {
      const parts = valStr.split('USD ');
      return (
        <>
          {parts[0]}<span className="text-sm font-normal text-muted-foreground mx-1">USD</span>{parts[1]}
        </>
      );
    }
    return value;
  };

  return (
    <div className={`relative overflow-hidden bg-card border border-border shadow-sm rounded-xl group ${className || ''}`}>
      {/* Visual Accent - Top Gradient */}
      <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-200 ${accentColors[accent]}`} />

      {/* Large Watermark Icon */}
      <div className="absolute top-0 end-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] group-hover:scale-110 group-hover:rotate-6 transition-all duration-200 pointer-events-none">
        <Icon className={`w-28 h-28 ${accentColors[accent]}`} />
      </div>

      <div className="p-7 relative z-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-label-xs font-semibold text-muted-foreground uppercase">
              {title}
            </p>
            <div className={`p-3 rounded-2xl text-muted-foreground transition-transform duration-200 group-hover:scale-110`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className={`text-headline-lg font-display tabular-nums ${accentColors[accent]}`}>
              {renderValue()}
            </h3>

            <div className="flex items-center gap-2">
              {trend && (
                <span className={`text-label-xs font-semibold uppercase px-2.5 py-1 rounded-xl ${trend.isPositive ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                  {trend.isPositive ? '↑' : '↓'} {trend.value}
                </span>
              )}
              {description && (
                <p className="text-label-xs font-semibold text-muted-foreground uppercase">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
