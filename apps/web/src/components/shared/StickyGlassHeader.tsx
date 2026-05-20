'use client';

import * as React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StickyGlassHeaderProps {
  title: React.ReactNode;
  statusBadge?: React.ReactNode;
  actions?: React.ReactNode;
  onBack?: () => void;
  className?: string;
}

export function StickyGlassHeader({
  title,
  statusBadge,
  actions,
  onBack,
  className,
}: StickyGlassHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-[9999] w-full bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm dark:bg-slate-950/90 dark:border-slate-800 flex items-center justify-between px-6 py-4 print:hidden',
        className,
      )}
    >
      <div className="flex items-center gap-4 overflow-hidden">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-lg shrink-0 hover:bg-surface-container-high"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </Button>
        )}
        <div className="flex flex-col min-w-0">
          <h1 className="text-title-lg font-semibold uppercase truncate">
            {title}
          </h1>
          {statusBadge && (
            <div className="flex items-center gap-2 mt-0.5">
              {statusBadge}
            </div>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
