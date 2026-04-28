import React, { ReactNode, ElementType, isValidElement } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string | ReactNode;
  icon?: ElementType | ReactNode;
  color?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo';
  className?: string;
  dir?: 'ltr' | 'rtl';
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
    text: 'text-status-warning',
    glow: 'from-status-warning/50',
    bg: 'bg-status-warning/10',
  },
  rose: {
    text: 'text-status-error',
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
  dir = 'ltr'
}: MetricCardProps) {
  const styles = colorMap[color as keyof typeof colorMap] || colorMap.cyan;

  return (
    <Card className={cn(
      "bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container text-foreground shadow-lg shadow-black/20",
      className
    )}>
      {/* Background Icon Decoration */}
      <div className="absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 duration-500">
        {Icon ? (isValidElement(Icon) ? Icon : React.createElement(Icon as any, { className: "w-24 h-24" })) : null}
      </div>

      <CardHeader className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-lg", styles.bg)}>
            {Icon ? (isValidElement(Icon) ? Icon : React.createElement(Icon as any, { className: cn("w-5 h-5", styles.text) })) : null}
          </div>
          {trend && (
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
              {trend}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            {label}
          </CardDescription>
          <CardTitle className={cn("text-4xl font-display font-bold tracking-tight", styles.text)} dir={dir}>
            {value}
          </CardTitle>
        </div>
      </CardHeader>

      {/* Bottom Glow */}
      <div className={cn("absolute bottom-0 start-0 h-[1px] w-full bg-gradient-to-r to-transparent", styles.glow)} />
    </Card>
  );
}
