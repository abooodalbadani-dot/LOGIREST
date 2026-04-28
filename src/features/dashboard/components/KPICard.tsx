'use client';

import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

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
}

export function KPICard({ title, value, icon: Icon, accent, description, trend, className }: KPICardProps) {
  const accentColors = {
    cyan: 'text-operational-cyan',
    amber: 'text-status-warning',
    red: 'text-status-error',
  };

  const accentBgs = {
    cyan: 'bg-operational-cyan/10',
    amber: 'bg-status-warning/10',
    red: 'bg-status-error/10',
  };

  const accentShadows = {
    cyan: 'shadow-[0_12px_24px_-8px_rgba(var(--operational-cyan-rgb),0.3)]',
    amber: 'shadow-[0_12px_24px_-8px_rgba(var(--status-warning-rgb),0.3)]',
    red: 'shadow-[0_12px_24px_-8px_rgba(var(--status-error-rgb),0.3)]',
  };

  return (
    <Card className={`relative overflow-hidden border border-white/10-muted/20 bg-surface-container-low/50 backdrop-blur-sm hover:bg-surface-container transition-all duration-500 rounded-2xl group shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] ${className || ''}`}>
      {/* Visual Accent - Top Gradient */}
      <div className={`absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-500 ${accentColors[accent]}`} />

      {/* Large Watermark Icon */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 pointer-events-none">
        <Icon className={`w-24 h-24 ${accentColors[accent]}`} />
      </div>

      <div className="p-6 relative z-10">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.25em]">
              {title}
            </p>
            <div className={`p-2.5 rounded-xl ${accentBgs[accent]} ${accentColors[accent]} border border-current/10 ${accentShadows[accent]}`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className={`text-3xl font-bold tracking-tighter tabular-nums ${accent === 'cyan' ? 'text-foreground' : accentColors[accent]}`}>
              {value}
            </h3>
            
            <div className="flex items-center gap-2">
              {trend && (
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${trend.isPositive ? 'bg-status-success/10 text-status-success' : 'bg-status-error/10 text-status-error'}`}>
                  {trend.isPositive ? '↑' : '↓'} {trend.value}
                </span>
              )}
              {description && (
                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Glow Bar */}
      <div className={`absolute bottom-0 left-0 h-[3px] w-full transition-all duration-500 opacity-20 group-hover:opacity-100 ${accent === 'cyan' ? 'bg-operational-cyan' : accent === 'amber' ? 'bg-status-warning' : 'bg-status-error'} shadow-[0_0_15px_currentColor]`} />
    </Card>
  );
}
