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
    'w-full bg-card border border-border/50 rounded-xl flex items-center justify-between px-6 py-4 print:hidden',
    isEditing && 'border-s-4 border-s-primary',
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
    <div className="flex items-center gap-3 shrink-0">
     {actions}
    </div>
   )}
  </div>
 );
}
