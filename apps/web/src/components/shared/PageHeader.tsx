'use client';

import React from 'react';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { Link } from '@/i18n/navigation';
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
 icon?: React.ReactNode;
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
 icon,
 children, 
 className 
}: PageHeaderProps) {
 return (
 <div data-slot="page-header" className={cn("flex flex-col gap-6 pb-8 relative", className)}>
 <div className="w-full flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
 <div className="w-full flex flex-col items-start text-right space-y-1.5">
 <div className="flex items-center gap-4">
 {backHref && (
 <Link 
 href={backHref}
 className="p-2 -ms-2 hover:bg-surface-container-high rounded-full transition-colors text-muted-foreground hover:text-foreground"
 >
 <ArrowLeft className="w-6 h-6 rtl:rotate-180" />
 </Link>
 )}
 {icon && <div className="flex-shrink-0">{icon}</div>}
  <h1 className="text-headline-lg md:text-headline-lg font-semibold text-foreground leading-normal">
 {title}
 </h1>
 {showStatus && status && (
 <StatusBadge status={status as BadgeStatus} />
 )}
 </div>
 {(subtitle || description) && (
  <p className="text-muted-foreground/60 font-medium text-label-xs whitespace-nowrap">
  {subtitle || description}
  </p>
 )}
 </div>

 {actions && (
 <div className="w-full sm:w-auto flex items-center gap-3 [&>*]:w-full [&>*]:sm:w-auto">
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
