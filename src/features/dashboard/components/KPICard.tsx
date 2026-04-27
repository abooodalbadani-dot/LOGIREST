'use client';

import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  accent: 'cyan' | 'amber' | 'red';
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function KPICard({ title, value, icon: Icon, accent, description, trend }: KPICardProps) {
  const accentColors = {
    cyan: 'text-cyan-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
  };

  const accentBgs = {
    cyan: 'bg-cyan-500/5',
    amber: 'bg-amber-500/5',
    red: 'bg-red-500/5',
  };

  const accentShadows = {
    cyan: 'shadow-[0_0_20px_rgba(6,182,212,0.1)]',
    amber: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]',
    red: 'shadow-[0_0_20px_rgba(239,68,68,0.1)]',
  };

  return (
    <Card className={`relative overflow-hidden border-none bg-surface-container-low hover:bg-surface-container transition-all duration-500 rounded group`}>
      {/* Large Watermark Icon */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 pointer-events-none">
        <Icon className={`w-20 h-20 ${accentColors[accent]}`} />
      </div>

      <div className="p-6 relative z-10">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-on-surface-muted uppercase tracking-[0.2em]">
              {title}
            </p>
            <div className={`p-2 rounded ${accentBgs[accent]} ${accentColors[accent]} ghost-border`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className={`text-3xl font-bold tracking-tighter font-display ${accent === 'cyan' ? 'text-foreground' : accentColors[accent]}`}>
              <span dir="ltr" className="tabular-nums drop-shadow-sm">
                {value}
              </span>
            </h3>
            
            <div className="flex items-center gap-2">
              {trend && (
                <span className={`text-[10px] font-bold ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {trend.isPositive ? '↑' : '↓'} {trend.value}
                </span>
              )}
              {description && (
                <p className="text-[10px] font-medium text-on-surface-muted/60 tracking-tight">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Glow Bar */}
      <div className={`absolute bottom-0 left-0 h-[2px] w-full transition-all duration-500 opacity-30 group-hover:opacity-100 ${accent === 'cyan' ? 'bg-cyan-500' : accent === 'amber' ? 'bg-amber-500' : 'bg-red-500'} shadow-[0_0_10px_currentColor]`} />
    </Card>
  );
}
