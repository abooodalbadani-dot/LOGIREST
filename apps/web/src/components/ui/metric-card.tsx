import React, { ReactNode, ElementType, isValidElement } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/app/[locale]/providers/currency-provider';

interface MetricCardProps {
    label: string;
    value: ReactNode;
    trend?: string | ReactNode;
    icon?: ElementType | ReactNode;
    color?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo';
    className?: string;
    dir?: 'ltr' | 'rtl';
    currency?: string;
    symbol?: string;
}

const colorMap = {
    cyan: {
        text: 'text-brand-gold',
        glow: 'from-brand-gold/50',
        bg: 'bg-brand-gold/10',
    },
    emerald: {
        text: 'text-brand-gold',
        glow: 'from-brand-gold/50',
        bg: 'bg-brand-gold/10',
    },
    amber: {
        text: 'text-yellow-600 dark:text-yellow-500',
        glow: 'from-status-warning/50',
        bg: 'bg-status-warning/10',
    },
    rose: {
        text: 'text-red-500',
        glow: 'from-status-error/50',
        bg: 'bg-status-error/10',
    },
    indigo: {
        text: 'text-status-info',
        glow: 'from-status-info/50',
        bg: 'bg-status-info/10',
    }
};

export function MetricCard({
    label,
    value,
    trend,
    icon: Icon,
    color = 'cyan',
    className,
    currency: propCurrency,
    symbol: propSymbol

}: MetricCardProps) {
    const contextCurrency = useCurrency();
    const currency = propCurrency ?? contextCurrency.currency;
    const symbol = propSymbol ?? contextCurrency.symbol;
    const styles = colorMap[color as keyof typeof colorMap] || colorMap.cyan;

    // Zero-state logic
    const stringValue = String(value).replace(/,/g, '').replace(/[^\d.-]/g, '');
    const numericValue = parseFloat(stringValue);
    const isZero = !isNaN(numericValue) && numericValue === 0;

    const valueColor = isZero ? 'text-muted-foreground dark:text-gray-400' : styles.text;

    // Currency Hierarchy Logic
    const renderValue = () => {
        const valStr = String(value);
        const currencySymbol = symbol || 'USD';
        if (valStr.includes(currencySymbol)) {
            const parts = valStr.split(currencySymbol);
            return (
                <>
                    {parts[0]}<span className="text-sm font-normal text-gray-400 dark:text-muted-foreground mx-1">{currencySymbol}</span>{parts[1]}
                </>
            );
        }
        const currencyCode = currency || 'USD';
        if (valStr.includes(currencyCode)) {
            const parts = valStr.split(currencyCode);
            return (
                <>
                    {parts[0]}<span className="text-sm font-normal text-gray-400 dark:text-muted-foreground mx-1">{currencyCode}</span>{parts[1]}
                </>
            );
        }
        if (currencySymbol !== 'USD' && valStr.includes('USD')) {
            const parts = valStr.split('USD ');
            return (
                <>
                    {parts[0]}<span className="text-sm font-normal text-gray-400 dark:text-muted-foreground mx-1">USD</span>{parts[1]}
                </>
            );
        }
        return value;
    };

    return (
        <Card className={cn(
            "bg-card border border-border shadow-sm rounded-xl p-3 sm:p-4 md:p-5 flex flex-row items-center justify-between overflow-hidden relative group transition-all isolate min-w-0",
            className
        )}>
            {/* Background Icon Decoration */}
            <div className="hidden md:block absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 duration-200 pointer-events-none">
                {Icon ? (isValidElement(Icon) ? Icon : React.createElement(Icon as ElementType, { className: "w-24 h-24" })) : null}
            </div>

            <div className="flex flex-col items-start gap-0.5 sm:gap-1 z-10 min-w-0 flex-1 me-2 sm:me-3">
                <CardDescription className="text-[10px] sm:text-label-xs font-bold uppercase text-[#b48e67] line-clamp-1 break-words w-full" dir="auto" style={{ unicodeBidi: 'isolate' }}>
                    {label}
                </CardDescription>
                <CardTitle className={cn("text-headline-xs sm:text-headline-sm md:text-headline-md font-display font-extrabold truncate w-full", valueColor)} dir="auto" style={{ unicodeBidi: 'isolate' }}>
                    <span dir="ltr" className="font-mono">{renderValue()}</span>
                </CardTitle>
                {trend && (
                    <span className="text-[9px] sm:text-label-xs font-semibold uppercase opacity-60 mt-0.5 truncate w-full">
                        {trend}
                    </span>
                )}
            </div>

            <div className={cn("p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl flex-shrink-0 z-10 transition-colors", styles.bg)}>
                {Icon ? (isValidElement(Icon) ? Icon : React.createElement(Icon as ElementType, { className: cn("w-4.5 h-4.5 sm:w-6 sm:h-6 md:w-8 md:h-8", isZero ? 'text-muted-foreground dark:text-gray-400' : styles.text) })) : null}
            </div>
        </Card>
    );
}
