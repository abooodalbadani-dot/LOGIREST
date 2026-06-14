'use client';

import { useTranslations } from 'next-intl';
import { Layers, Warehouse, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyScopeStateProps {
  context: 'branch' | 'warehouse' | 'department';
  className?: string;
}

export function EmptyScopeState({ context, className }: EmptyScopeStateProps) {
  const t = useTranslations('scope_guard');

  const icons = {
    branch: Building2,
    warehouse: Warehouse,
    department: Layers
  };

  const Icon = icons[context];

  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5 animate-in fade-in zoom-in-95 duration-500", className)}>
      <div className="relative">
        <div className="absolute inset-0 bg-status-warning/20 blur-xl rounded-full animate-pulse" />
        <div className="p-5 bg-status-warning/10 text-status-warning rounded-2xl relative z-10 border border-status-warning/20 shadow-lg shadow-status-warning/5">
          <Icon className="w-10 h-10" />
        </div>
      </div>
      
      <div className="w-full max-w-md space-y-2 px-4">
        <h2 className="text-title-lg font-bold uppercase text-foreground w-full">
          {t(`${context}_title`)}
        </h2>
        <p className="text-body-md text-muted-foreground leading-relaxed w-full">
          {t(`${context}_desc`)}
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-label-sm font-semibold text-status-warning uppercase animate-pulse">
        <div className="w-2 h-2 rounded-full bg-status-warning" />
        {t('action_hint')}
      </div>
    </div>
  );
}
