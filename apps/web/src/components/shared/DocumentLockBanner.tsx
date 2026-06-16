'use client';
import { useTranslations } from 'next-intl';
import { Lock, CheckCircle2, AlertCircle, ShieldAlert, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentLockBannerProps {
 status: string;
 isLocked: boolean;
 lockReason?: string;
 message?: string;
 className?: string;
 variant?: 'finalized' | 'approval' | 'rejected' | 'warning';
}

/**
 * A standard banner to indicate that a document is in a locked or special status.
 * This is a presentational component that should receive its state from the parent.
 */
export function DocumentLockBanner({ 
 status, 
 isLocked, 
 lockReason,
 message, 
 className,
 variant
}: DocumentLockBannerProps) {
 const t = useTranslations('common');

 if (!isLocked && !message) return null;

 // Determine variant if not explicitly provided
 const statusUpper = status?.toUpperCase() || '';
 const effectiveVariant = variant || (
  ['POSTED', 'CLOSED', 'COMPLETED', 'RECEIVED', 'APPROVED'].includes(statusUpper) ? 'finalized' :
  ['REJECTED', 'CANCELLED', 'VOID'].includes(statusUpper) ? 'rejected' :
  ['SUBMITTED', 'REVIEW', 'PENDING'].includes(statusUpper) ? 'approval' :
  'warning'
 );

 const styles = {
  finalized: "bg-emerald-500/5 border-emerald-500/20 text-emerald-600",
  rejected: "bg-error/5 border-error/20 text-error",
  approval: "bg-amber-500/5 border-amber-500/20 text-amber-600",
  warning: "bg-status-warning/5 border-status-warning/20 text-status-warning",
 };

 const iconStyles = {
  finalized: "bg-emerald-500/20 text-emerald-600",
  rejected: "bg-error/20 text-error",
  approval: "bg-amber-500/20 text-amber-600",
  warning: "bg-status-warning/20 text-status-warning",
 };

 return (
  <div className={cn(
   "w-full sm:rounded-2xl p-5 flex items-center justify-between gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-200 backdrop-blur-xl border-2 shadow-2xl shadow-black/5",
   styles[effectiveVariant],
   className
  )}>
   <div className="flex items-center gap-4">
    <div className={cn(
     "flex shrink-0 items-center justify-center h-12 w-12 rounded-2xl shadow-sm transition-transform hover:scale-105 duration-300",
     iconStyles[effectiveVariant]
    )}>
     {effectiveVariant === 'finalized' ? <CheckCircle2 className="h-6 w-6" /> : 
      effectiveVariant === 'rejected' ? <ShieldAlert className="h-6 w-6" /> :
      isLocked ? <Lock className="h-6 w-6" /> : 
      <AlertCircle className="h-6 w-6" />}
    </div>
    <div className="flex flex-col gap-1">
     <div className="flex items-center gap-2">
      <span className="font-black uppercase text-[10px] tracking-[0.15em] opacity-50">
       {isLocked ? t('document_locked') : t('document_status')}
      </span>
      {lockReason && (
       <span className="px-1.5 py-0.5 rounded bg-black/5 text-[9px] font-bold uppercase opacity-40 border">
        {lockReason}
       </span>
      )}
     </div>
     <span className="text-body-md font-bold leading-tight tracking-tight">
      {message || `${t('status_label')}: ${status}`}
     </span>
    </div>
   </div>
   
   {isLocked && (
    <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-card/40 dark:bg-black/20 border border-white/60 dark:border-white/5 shadow-inner">
     <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
     <span className="text-[10px] font-black uppercase tracking-wider opacity-60">{t('read_only_mode')}</span>
     <Info className="h-3.5 w-3.5 opacity-30" />
    </div>
   )}
  </div>
 );
}

/**
 * A wrapper that applies a visual "locked" state to its children.
 * Instead of pointer-events: none, it uses grayscale and opacity to signal read-only mode
 * while keeping tooltips and scroll interactions functional.
 */
export function DocumentLockWrapper({ 
 isLocked, 
 children,
 className
}: { 
 isLocked: boolean; 
 children: React.ReactNode;
 className?: string;
}) {
 return (
  <div className={cn(
   "transition-all duration-200 ease-in-out w-full",
   isLocked && "opacity-85 grayscale-[0.2] contrast-[0.95]",
   className
  )}>
   {children}
  </div>
 );
}

