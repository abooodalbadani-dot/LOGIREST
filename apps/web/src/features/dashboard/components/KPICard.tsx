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
    const activeSymbol = symbol || currency || '';

    if (activeSymbol && valStr.includes(activeSymbol)) {
      const parts = valStr.split(activeSymbol);
      return (
        <>
          {parts[0]}<span className="text-sm font-normal text-muted-foreground mx-1">{activeSymbol}</span>{parts[1]}
        </>
      );
    }
    if (currency && valStr.includes(currency)) {
      const parts = valStr.split(currency);
      return (
        <>
          {parts[0]}<span className="text-sm font-normal text-muted-foreground mx-1">{currency}</span>{parts[1]}
        </>
      );
    }
    if (activeSymbol && (valStr.includes('US$') || valStr.includes('$ US') || valStr.includes('USD') || valStr.includes('$'))) {
      const cleanVal = valStr.replace(/US\$/g, '').replace(/\$\s*US/g, '').replace(/USD/g, '').replace(/\$/g, '').trim();
      return (
        <>
          {cleanVal} <span className="text-sm font-normal text-muted-foreground mx-1">{activeSymbol}</span>
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

      <div className="p-3 sm:p-5 md:p-7 relative z-10">
        <div className="space-y-2 sm:space-y-4 md:space-y-6">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[10px] sm:text-label-xs font-bold text-muted-foreground uppercase line-clamp-1">
              {title}
            </p>
            <div className={`p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-2xl text-muted-foreground transition-transform duration-200 group-hover:scale-110 shrink-0`}>
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="space-y-1 sm:space-y-2">
            <h3 className={`text-headline-xs sm:text-headline-sm md:text-headline-lg font-display tabular-nums truncate ${accentColors[accent]}`}>
              {renderValue()}
            </h3>

            <div className="flex items-center gap-1.5 flex-wrap">
              {trend && (
                <span className={`text-[9px] sm:text-label-xs font-semibold uppercase px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl ${trend.isPositive ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                  {trend.isPositive ? '↑' : '↓'} {trend.value}
                </span>
              )}
              {description && (
                <p className="text-[9px] sm:text-label-xs font-semibold text-muted-foreground uppercase line-clamp-1">
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
