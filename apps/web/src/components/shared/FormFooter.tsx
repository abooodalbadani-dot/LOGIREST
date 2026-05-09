'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Save, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFooterProps {
  onCancel: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  isDirty?: boolean;
  isValid?: boolean;
  cancelLabel?: string;
  saveLabel?: string;
  className?: string;
  saveIcon?: React.ReactNode;
}

export function FormFooter({
  onCancel,
  onSubmit,
  isSaving,
  isDirty = true,
  isValid = true,
  cancelLabel,
  saveLabel,
  className,
  saveIcon
}: FormFooterProps) {
  const t = useTranslations('common');

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6",
      "bg-surface-container-low/80 backdrop-blur-md border-t border-white/5",
      "flex items-center justify-between gap-4 animate-in slide-in-from-bottom-full duration-500",
      className
    )}>
      <div className="max-w-[1000px] mx-auto w-full flex items-center justify-between">
        <Button
          variant="outline"
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="h-12 px-8 text-label-xs font-semibold uppercase rounded-xl border-none bg-surface-container-high/40 hover:bg-surface-container-high transition-all"
        >
          <X className="w-4 h-4 me-2 opacity-60" />
          {cancelLabel || t('cancel')}
        </Button>

        <div className="flex items-center gap-4">
          {!isValid && isDirty && (
            <span className="text-error text-label-xs font-semibold uppercase animate-pulse hidden md:block">
              Please check required fields
            </span>
          )}
          
          <Button
            onClick={onSubmit}
            disabled={isSaving || (!isDirty && !isSaving)}
            className="h-12 px-10 bg-operational-cyan text-white text-label-xs font-semibold uppercase rounded-xl transition-all hover:brightness-110 active:scale-95 border-none disabled:opacity-50 disabled:grayscale shadow-lg shadow-operational-cyan/20"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
            ) : (
              saveIcon || <Save className="w-4 h-4 me-2" />
            )}
            {isSaving ? t('saving') : (saveLabel || t('save'))}
          </Button>
        </div>
      </div>
    </div>
  );
}
