'use client';

import { LucideIcon } from 'lucide-react';

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



  return (
    <div className={`relative overflow-hidden bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-140 ease-industrial rounded-2xl group ${className || ''}`}>
      {/* Visual Accent - Top Gradient */}
      <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-200 ${accentColors[accent]}`} />

      {/* Large Watermark Icon */}
      <div className="absolute top-0 end-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] group-hover:scale-110 group-hover:rotate-6 transition-all duration-200 pointer-events-none">
        <Icon className={`w-28 h-28 ${accentColors[accent]}`} />
      </div>

      <div className="p-7 relative z-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase">
              {title}
            </p>
            <div className={`p-3 rounded-2xl ${accentBgs[accent]} ${accentColors[accent]} transition-transform duration-200 group-hover:scale-110`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className={`text-headline-lg font-display tabular-nums ${accent === 'cyan' ? 'text-foreground' : accentColors[accent]}`}>
              {value}
            </h3>
            
            <div className="flex items-center gap-2">
              {trend && (
                <span className={`text-label-xs font-semibold uppercase px-2.5 py-1 rounded-xl ${trend.isPositive ? 'bg-status-success/10 text-status-success' : 'bg-status-error/10 text-status-error'}`}>
                  {trend.isPositive ? '↑' : '↓'} {trend.value}
                </span>
              )}
              {description && (
                <p className="text-label-xs font-semibold text-muted-foreground/30 uppercase">
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
