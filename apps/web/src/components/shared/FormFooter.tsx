'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Save, X, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFooterProps {
  onCancel: () => void;
  onSubmit?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  isValid?: boolean;
  cancelLabel?: string;
  saveLabel?: string;
  className?: string;
  saveIcon?: React.ReactNode;
  isLocked?: boolean;
  actions?: React.ReactNode;
  showValidationWarning?: boolean;
  
  // Aliases for compatibility
  isPending?: boolean;
  submitLabel?: string;
  canSubmit?: boolean;
}

/**
 * Standard Form Footer for all operation and procurement forms.
 * Provides a consistent placement for Cancel/Save actions and status indicators.
 */
export function FormFooter({
  onCancel,
  onSubmit,
  isSaving,
  isDirty = true,
  isValid = true,
  cancelLabel,
  saveLabel,
  className,
  saveIcon,
  isLocked = false,
  actions,
  showValidationWarning,
  
  // Aliases
  isPending,
  submitLabel,
  canSubmit,
}: FormFooterProps) {
  const t = useTranslations('common');
  
  const actualIsSaving = isSaving || isPending;
  const actualSaveLabel = saveLabel || submitLabel;
  const actualIsValid = isValid && (canSubmit !== undefined ? canSubmit : true);
  
  // Determine if we should show the validation warning badge
  const shouldShowWarning = showValidationWarning ?? (!isLocked && !actualIsValid && isDirty);

  return (
    <div className={cn(
      "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-fit max-w-[95vw] px-4",
      "animate-in slide-in-from-bottom-8 duration-200 ease-out",
      className
    )}>
      <div className={cn(
        "bg-surface-ledger/95 backdrop-blur-2xl",
        "border border-white/10",
        "shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6),0_0_20px_rgba(var(--primary-rgb),0.15)]",
        "rounded-full h-12 md:h-14 px-2 md:px-3 flex items-center transition-all gap-1 md:gap-2"
      )}>
        {/* Secondary Action: Cancel / Back */}
        <Button
          variant="ghost"
          type="button"
          onClick={onCancel}
          disabled={actualIsSaving}
          className={cn(
            "h-8 md:h-10 px-3 md:px-5 rounded-full",
            "text-[10px] md:text-label-sm font-black uppercase tracking-widest",
            "text-white/60 hover:text-white hover:bg-white/5 transition-all",
            "group flex items-center gap-2 shrink-0 border-none"
          )}
        >
          {isLocked ? (
            <ArrowLeft className={cn("w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1")} />
          ) : (
            <X className={cn("w-4 h-4 md:w-5 md:h-5 opacity-50 transition-transform group-hover:rotate-90")} />
          )}
          <span className="hidden md:inline">{isLocked ? (cancelLabel || t('back_to_list')) : (cancelLabel || t('cancel'))}</span>
        </Button>

        {/* Vertical Divider */}
        {(actions || (onSubmit && !isLocked)) && (
          <div className="w-px h-8 bg-white/10 mx-1 shrink-0" />
        )}

        <div className="flex items-center gap-3">
          {/* Validation Warning Badge */}
          {shouldShowWarning && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-status-error/10 border border-status-error/20 animate-in fade-in zoom-in duration-300 shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-status-error" />
              <span className="text-status-error text-[10px] font-black uppercase tracking-wider">
                {t('check_fields') || 'Check Required Fields'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Custom Extra Actions (Workflow Actions: Post, Ship, etc) */}
            {actions}
            
            {/* Primary Action: Save / Submit (Drafting) */}
            {onSubmit && !isLocked && (
              <Button
                onClick={onSubmit}
                disabled={actualIsSaving || !actualIsValid || (!isDirty && !actualIsSaving)}
                className={cn(
                  "h-8 md:h-10 px-6 md:px-10 rounded-full transition-all",
                  "bg-primary !text-white hover:opacity-90 active:scale-95",
                  "text-[10px] md:text-label-sm font-black uppercase tracking-widest",
                  "disabled:opacity-100 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none",
                  "flex items-center gap-2 shrink-0 shadow-lg shadow-primary/20"
                )}
              >
                {actualIsSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  saveIcon || <Save className="w-4 h-4 md:w-5 md:h-5" />
                )}
                <span>{actualIsSaving ? t('saving') : (actualSaveLabel || t('save'))}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>


  );
}

