'use client';

import React from 'react';
import { StatusBadge, type BadgeStatus } from '@/components/ui/status-badge';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  status?: string;
  showStatus?: boolean;
  backHref?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  subtitle, 
  description, 
  actions, 
  status, 
  showStatus, 
  backHref, 
  children, 
  className 
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-6 pb-8 relative", className)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-4">
            {backHref && (
              <Link 
                href={backHref}
                className="p-2 -ms-2 hover:bg-surface-container-high rounded-full transition-colors text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
            )}
            <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-foreground uppercase italic leading-none">
              {title}
            </h1>
            {showStatus && status && (
              <StatusBadge status={status as BadgeStatus} />
            )}
          </div>
          {(subtitle || description) && (
            <p className="text-muted-foreground/60 font-medium tracking-wide uppercase text-[11px] max-w-2xl">
              {subtitle || description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>

      {children && (
        <div className="mt-2">
          {children}
        </div>
      )}
    </div>
  );
}
