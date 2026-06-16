'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DocumentLockProps {
 isLocked: boolean;
 children: React.ReactNode;
 className?: string;
 showBadge?: boolean;
}

/**
 * Component to enforce immutable states for approved/closed documents.
 * Wraps content in a disabled fieldset to prevent interactions while preserving
 * accessibility and scrollability.
 */
export function DocumentLock({ 
 isLocked, 
 children, 
 className,
 showBadge = true
}: DocumentLockProps) {
 const t = useTranslations('common');

 if (!isLocked) {
  return <>{children}</>;
 }

 return (
  <div className={cn("relative group/lock", className)}>
   {showBadge && (
    <div className="absolute top-4 end-4 z-20 flex items-center gap-2 px-3 py-1.5 bg-surface-container-highest/80 backdrop-blur-md border border-outline-low rounded-full shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
     <Lock className="w-3 h-3 text-operational-cyan" />
     <span className="text-label-xxs font-bold uppercase text-operational-cyan/80 tracking-wider">
      {t('workflow.document_locked')}
     </span>
    </div>
   )}
   
   <fieldset disabled={isLocked} className="contents">
    <div className={cn(
     "transition-all duration-200",
     isLocked && "opacity-80 grayscale-[0.2] cursor-not-allowed"
    )}>
     {children}
    </div>
   </fieldset>

   {/* Invisible overlay for tooltips or specialized lock messaging if needed */}
   {isLocked && <div className="absolute inset-0 z-10 pointer-events-auto cursor-not-allowed" title={t('workflow.locked_description')} />}
  </div>
 );
}
