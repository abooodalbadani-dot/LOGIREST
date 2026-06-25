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
 isEditing?: boolean;
}

export function StickyGlassHeader({
 title,
 statusBadge,
 actions,
 onBack,
 className,
 isEditing,
}: StickyGlassHeaderProps) {
 return (
  <div
   className={cn(
    'flex flex-col md:flex-row justify-between items-start md:items-center p-4 gap-4 bg-white dark:bg-[#1A2234] rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden print:hidden',
    isEditing && 'border-s-4 border-s-primary',
    className,
   )}
  >
   <div className="flex items-center gap-4 overflow-hidden w-full md:w-auto min-w-0">
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
    <div className="flex flex-col min-w-0 flex-1">
     <h1 className="text-2xl font-extrabold text-foreground tracking-tight uppercase truncate">
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
    <div className="w-full md:w-auto shrink-0">
     {actions}
    </div>
   )}
  </div>
 );
}
