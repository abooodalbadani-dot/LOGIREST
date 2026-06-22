'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';

export interface PageHeaderProps {
  title: React.ReactNode;
  highlight?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  // Legacy props kept for safe migration to children or to handle specific cases:
  backHref?: string;
  status?: string;
  showStatus?: boolean;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  description?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  highlight, 
  subtitle, 
  children,
  className,
  backHref,
  status,
  showStatus,
  icon,
  actions,
  description
}: PageHeaderProps) {
  const actualSubtitle = subtitle || description;
  const actualChildren = children || actions;
  
  let finalTitle = title;
  let finalHighlight = highlight;

  if (typeof title === 'string' && !highlight) {
    const parts = title.trim().split(/\s+/);
    if (parts.length > 1) {
      finalHighlight = parts.pop();
      finalTitle = parts.join(' ');
    }
  }

  return (
    <div data-slot="page-header" className={cn("flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full border-b border-border/50 pb-4 mb-2 flex-wrap", className)}>
      <div className="flex flex-col items-start text-start gap-2 min-w-0">
        <div className="flex items-start sm:items-center gap-4 flex-wrap">
          {backHref && (
            <Link 
              href={backHref}
              className="p-2 -ms-2 hover:bg-surface-container-high rounded-full transition-colors text-muted-foreground hover:text-foreground shrink-0 mt-1 sm:mt-0"
            >
              <ArrowLeft className="w-6 h-6 rtl:rotate-180" />
            </Link>
          )}
          {icon && <div className="flex-shrink-0 mt-2 sm:mt-0">{icon}</div>}
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight uppercase flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0 break-words">
            {finalTitle} {finalHighlight && <span className="text-primary font-extrabold mx-1">{finalHighlight}</span>}
          </h1>
          {showStatus && status && (
            <StatusBadge status={status as BadgeStatus} className="mt-1 sm:mt-0" />
          )}
        </div>
        {actualSubtitle && (
          <div className="text-sm font-bold text-muted-foreground tracking-widest uppercase mt-2 break-words">
            {actualSubtitle}
          </div>
        )}
      </div>
      {actualChildren && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 min-w-0">
          {actualChildren}
        </div>
      )}
    </div>
  );
}

