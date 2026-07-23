'use client';

import React, { useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Loader2, AlertTriangle, Trash2, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
 AlertDialog,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
 AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';

interface PostConfirmDialogProps {
 open?: boolean;
 onOpenChange?: (open: boolean) => void;
 title: string;
 description: string;
 warningText?: string;
 requiresTextConfirmation?: boolean;
 confirmKeyword?: string;
 isLoading?: boolean;
 onConfirm: () => void | Promise<void>;
 trigger?: React.ReactElement;
 children?: React.ReactNode;
 variant?: 'warning' | 'destructive' | 'default' | 'info';
 confirmText?: string;
 cancelText?: string;
 icon?: 'delete' | 'reject' | 'warning' | 'info';
 disabled?: boolean;
 className?: string;
}

/**
 * Standardized Confirmation Dialog for destructive mutations and workflow state changes.
 * Refactored to meet LogiRest Phase 5 premium aesthetics and safety standards.
 */
const VARIANT_STYLES = {
 destructive: "bg-status-error/10 text-status-error shadow-status-error/20",
 warning: "bg-status-warning/10 text-status-warning shadow-status-warning/20",
 info: "bg-operational-cyan/10 text-operational-cyan shadow-operational-cyan/20",
 default: "bg-operational-cyan/10 text-operational-cyan shadow-operational-cyan/20",
};

const ICON_MAP = {
 delete: Trash2,
 reject: XCircle,
 warning: AlertTriangle,
 info: Info,
};

export function PostConfirmDialog({
 open: controlledOpen,
 onOpenChange: controlledOnOpenChange,
 title,
 description,
 warningText,
 requiresTextConfirmation = false,
 confirmKeyword,
 isLoading = false,
 onConfirm,
 trigger,
 children,
 variant = 'warning',
 confirmText: customConfirmText,
 cancelText: customCancelText,
 icon,
 disabled = false,
 className,
}: PostConfirmDialogProps) {
 const t = useTranslations('common');
 const locale = useLocale();
 const [internalOpen, setInternalOpen] = useState(false);
 const [confirmInput, setConfirmInput] = useState('');
 const [localLoading, setLocalLoading] = useState(false);
 // Synchronous ref-based guard — prevents double-submission between renders.
 // useState updates are async and can let a second click through before re-render.
 const isSubmittingRef = useRef(false);

 const open = controlledOpen ?? internalOpen;
 const rawOnOpenChange = controlledOnOpenChange ?? setInternalOpen;

 const handleOpenChange = (newOpen: boolean, event?: { cancel?: () => void }) => {
  // Prevent closing via Escape key or backdrop click if loading
  if (!newOpen && (isLoading || localLoading)) {
   if (event?.cancel) {
    event.cancel();
   }
   return;
  }
  rawOnOpenChange(newOpen);
 };

 const isRtl = locale === 'ar';
 const defaultKeyword = isRtl ? 'تأكيد' : 'CONFIRM';
 const requiredWord = confirmKeyword || defaultKeyword;
 const isConfirmDisabled =
  isLoading ||
  localLoading ||
  disabled ||
  (requiresTextConfirmation &&
   confirmInput.trim().toLowerCase() !== requiredWord.trim().toLowerCase());

 const handleConfirm = async (e: React.MouseEvent) => {
  e.preventDefault();
  // Synchronous ref check first — blocks second click before React re-renders
  if (isSubmittingRef.current || localLoading || isLoading || disabled) return;
  isSubmittingRef.current = true;
  setLocalLoading(true);
  try {
   await onConfirm();
   // Only close and reset on success
   rawOnOpenChange(false);
   setConfirmInput('');
  } catch {
   // Error is already surfaced via toast from useSafeMutation / caller.
   // Keep the dialog open so the user can see the failure and retry or dismiss manually.
  } finally {
   isSubmittingRef.current = false;
   setLocalLoading(false);
  }
 };

 const Icon = (icon && ICON_MAP[icon]) || (variant === 'info' ? Info : AlertTriangle);

 return (
  <AlertDialog open={open} onOpenChange={handleOpenChange}>
   {trigger && <AlertDialogTrigger render={trigger} />}
   <AlertDialogContent className={cn("sm:max-w-2xl w-[95vw] sm:w-full p-8 bg-white dark:bg-card shadow-2xl border border-gray-200 dark:border-gray-800 rounded-2xl animate-in fade-in zoom-in-95 duration-300", className)}>
    <AlertDialogHeader className="space-y-4">
     <div className={cn(
      "w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-transform duration-200 hover:scale-110",
      VARIANT_STYLES[variant]
     )}>
      <Icon className="w-6 h-6" />
     </div>
     <div className="space-y-2">
      <AlertDialogTitle className="text-lg font-black text-[#0B1220] dark:text-white uppercase tracking-tight">
       {title}
      </AlertDialogTitle>
      <AlertDialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-2">
       {description}
      </AlertDialogDescription>
     </div>
     {!(isLoading || localLoading) && (
      <button
       onClick={() => handleOpenChange(false)}
       className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors bg-transparent border-none"
       aria-label={t('actions.close')}
      >
       ✕
      </button>
     )}
    </AlertDialogHeader>

    <div className="my-6 space-y-6">
     {(warningText || t('posting_irreversible')) && (
      <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg p-3 mt-4 flex items-start gap-3">
       <AlertTriangle className="w-4 h-4 text-yellow-800 dark:text-yellow-500 shrink-0 mt-0.5" />
       <span className="text-xs font-bold text-yellow-800 dark:text-yellow-500">
        {warningText || t('posting_irreversible')}
       </span>
      </div>
     )}

     {children}

     {requiresTextConfirmation && (
      <div className="space-y-3">
       <label className="text-label-xs font-bold text-muted-foreground/40 uppercase ms-1">
        {t('confirm_word_prompt', { keyword: requiredWord })}
       </label>
       <Input
        type="text"
        value={confirmInput}
        onChange={(e) => setConfirmInput(e.target.value)}
        disabled={isLoading || localLoading}
        className="h-12 bg-surface-container-high/40 border-none rounded-xl px-4 text-foreground outline-none focus:ring-2 focus:ring-operational-cyan/20 transition-all font-mono font-bold uppercase tracking-widest placeholder:opacity-20"
        placeholder={requiredWord}
        autoFocus
       />
      </div>
     )}
    </div>

    <AlertDialogFooter className="gap-4 mt-2">
     {!(isLoading || localLoading) && (
      <AlertDialogCancel
       render={
        <button
         type="button"
         className="w-full py-2.5 bg-transparent border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-[#0B1220] transition-colors outline-none select-none focus:outline-none"
        />
       }
       disabled={isLoading || localLoading}
      >
       {customCancelText || t('actions.cancel')}
      </AlertDialogCancel>
     )}
     <button
      type="button"
      onClick={handleConfirm}
      disabled={isConfirmDisabled}
      aria-label={(isLoading || localLoading) ? t('loading') : (customConfirmText || t('actions.confirm'))}
      aria-busy={isLoading || localLoading}
      className={cn(
       "w-full py-2.5 bg-[#0B1220] dark:bg-[#b48e67] text-white dark:text-[#0B1220] font-bold rounded-lg hover:bg-gray-800 dark:hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 outline-none select-none focus:outline-none disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99]",
       (isLoading || localLoading) && "cursor-not-allowed"
      )}
     >
      {(isLoading || localLoading) ? (
       <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
       customConfirmText || t('actions.confirm')
      )}
     </button>
    </AlertDialogFooter>
   </AlertDialogContent>
  </AlertDialog>
 );
}
