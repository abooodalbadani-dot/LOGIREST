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
        text: 'text-status-success',
        glow: 'from-status-success/50',
        bg: 'bg-status-success/10',
    },
    emerald: {
        text: 'text-status-success',
        glow: 'from-status-success/50',
        bg: 'bg-status-success/10',
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
            "bg-card border border-border shadow-sm rounded-xl p-4 sm:p-5 flex flex-row items-center justify-between overflow-hidden relative group transition-all",
            className
        )}>
            {/* Background Icon Decoration (Optional/Hidden on mobile to save space) */}
            <div className="hidden sm:block absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 duration-200 pointer-events-none">
                {Icon ? (isValidElement(Icon) ? Icon : React.createElement(Icon as ElementType, { className: "w-24 h-24" })) : null}
            </div>

            <div className="flex flex-col items-start gap-1 z-10">
                <CardDescription className="text-label-xs font-semibold uppercase text-muted-foreground whitespace-nowrap" dir="auto" style={{ unicodeBidi: 'isolate' }}>
                    {label}
                </CardDescription>
                <CardTitle className={cn("text-headline-sm sm:text-headline-md font-display font-bold", valueColor)} dir="auto" style={{ unicodeBidi: 'isolate' }}>
                    <span dir="ltr" className="font-mono">{renderValue()}</span>
                </CardTitle>
                {trend && (
                    <span className="text-label-xs font-semibold uppercase opacity-60 mt-1">
                        {trend}
                    </span>
                )}
            </div>

            <div className={cn("p-2.5 rounded-xl flex-shrink-0 z-10 transition-colors", styles.bg)}>
                {Icon ? (isValidElement(Icon) ? Icon : React.createElement(Icon as ElementType, { className: cn("w-6 h-6 sm:w-8 sm:h-8", isZero ? 'text-muted-foreground dark:text-gray-400' : styles.text) })) : null}
            </div>
        </Card>
    );
}
