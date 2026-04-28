import React from 'react';
import { StatusBadge, type BadgeStatus } from '@/components/ui/status-badge';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  status?: string;
  showStatus?: boolean;
  className?: string;
}

export function PageHeader({ title, description, actions, status, showStatus, className }: PageHeaderProps) {
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 relative ${className || ''}`}>
      {/* Decorative accent */}
      <div className="absolute -left-8 top-0 bottom-8 w-1 bg-gradient-to-b from-operational-cyan/50 to-transparent opacity-50 rounded-r-full" />
      
      <div className="space-y-1.5">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-foreground uppercase italic leading-none">
            {title}
          </h1>
          {showStatus && status && (
            <StatusBadge status={status.toUpperCase() as BadgeStatus} />
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.25em] font-bold">
            {description}
          </p>
        )}
      </div>
      
      {actions && (
        <div className="flex items-center gap-4 bg-surface-container-low/50 p-1.5 rounded-sm backdrop-blur-sm">
          {actions}
        </div>
      )}
    </div>
  );
}

