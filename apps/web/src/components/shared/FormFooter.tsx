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
      "fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6",
      "bg-white/80 dark:bg-black/60 backdrop-blur-2xl border-t border-black/5 dark:border-white/5",
      "shadow-[0_-8px_30px_rgb(0,0,0,0.04)]",
      "animate-in slide-in-from-bottom-full duration-700 ease-out",
      className
    )}>
      <div className="max-w-[1400px] mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Secondary Action: Cancel / Back */}
        <Button
          variant="ghost"
          type="button"
          onClick={onCancel}
          disabled={actualIsSaving}
          className="h-14 px-8 text-label-xs font-black uppercase tracking-widest rounded-2xl bg-surface-container-high/20 hover:bg-surface-container-high transition-all border-none group"
        >
          {isLocked ? (
            <ArrowLeft className={cn("w-4 h-4 me-3 transition-transform group-hover:-translate-x-1")} />
          ) : (
            <X className={cn("w-4 h-4 me-3 opacity-60 transition-transform group-hover:rotate-90")} />
          )}
          {isLocked ? (cancelLabel || t('back_to_list')) : (cancelLabel || t('cancel'))}
        </Button>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          {/* Validation Warning Badge */}
          {shouldShowWarning && (
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-error/5 border border-error/10 animate-in fade-in zoom-in duration-300">
              <AlertCircle className="w-3.5 h-3.5 text-error" />
              <span className="text-error text-[10px] font-black uppercase tracking-wider">
                {t('check_fields') || 'Check Required Fields'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-4">
            {/* Custom Extra Actions (e.g., Post, Approve buttons) */}
            {actions}
            
            {/* Primary Action: Save / Submit */}
            {onSubmit && !isLocked && (
              <Button
                onClick={onSubmit}
                disabled={actualIsSaving || !actualIsValid || (!isDirty && !actualIsSaving)}
                className={cn(
                  "h-14 px-12 bg-operational-cyan text-white text-label-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-operational-cyan/30 border-none",
                  "hover:brightness-110 active:scale-95 hover:shadow-operational-cyan/40",
                  "disabled:opacity-40 disabled:grayscale disabled:scale-100 disabled:shadow-none"
                )}
              >
                {actualIsSaving ? (
                  <Loader2 className="w-5 h-5 me-3 animate-spin" />
                ) : (
                  saveIcon || <Save className="w-5 h-5 me-3" />
                )}
                {actualIsSaving ? t('saving') : (actualSaveLabel || t('save'))}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

