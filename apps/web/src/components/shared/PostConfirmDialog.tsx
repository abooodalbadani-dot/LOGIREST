'use client';

import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
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

const BUTTON_STYLES = {
  destructive: "bg-status-error hover:bg-status-error/90 text-white shadow-status-error/20",
  warning: "bg-status-warning hover:bg-status-warning/90 text-white shadow-status-warning/20",
  info: "bg-operational-cyan hover:bg-operational-cyan/90 text-white shadow-operational-cyan/20",
  default: "bg-operational-cyan hover:bg-operational-cyan/90 text-white shadow-operational-cyan/20",
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
  
  const open = controlledOpen ?? internalOpen;
  const rawOnOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const handleOpenChange = (newOpen: boolean, event?: { cancel?: () => void }) => {
    // Prevent closing via Escape key or backdrop click if loading
    if (!newOpen && isLoading) {
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
  const isConfirmDisabled = isLoading || disabled || (requiresTextConfirmation && confirmInput !== requiredWord);

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onConfirm();
    handleOpenChange(false);
    setConfirmInput('');
  };

  const Icon = (icon && ICON_MAP[icon]) || (variant === 'info' ? Info : AlertTriangle);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <AlertDialogTrigger render={trigger} />}
      <AlertDialogContent className={cn("max-w-md border-none ambient-shadow p-8 bg-surface-container-lowest rounded-2xl animate-in fade-in zoom-in-95 duration-300", className)}>
        <AlertDialogHeader className="space-y-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-transform duration-200 hover:scale-110",
            VARIANT_STYLES[variant]
          )}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <AlertDialogTitle className="text-headline-sm font-bold uppercase tracking-tight">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-label-sm font-medium text-muted-foreground/60 leading-relaxed uppercase">
              {description}
            </AlertDialogDescription>
          </div>
          {!isLoading && (
            <button 
              onClick={() => handleOpenChange(false)}
              className="absolute right-8 top-8 w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-high hover:bg-surface-container-highest transition-all text-muted-foreground/60 hover:text-foreground"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </AlertDialogHeader>

        <div className="my-6 space-y-6">
          {(warningText || t('posting_irreversible')) && (
            <div className={cn(
              "p-4 rounded-2xl border flex flex-col gap-1",
              variant === 'destructive' ? "bg-status-error/5 border-status-error/10" : "bg-status-warning/5 border-status-warning/10"
            )}>
              <div className="flex items-center gap-2 text-label-xs font-bold uppercase">
                <AlertTriangle className="w-3.5 h-3.5" />
                {warningText || t('warning')}
              </div>
              <p className="text-label-xxs font-medium opacity-60 uppercase">
                {t('posting_irreversible')}
              </p>
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
                disabled={isLoading}
                className="h-12 bg-surface-container-high/40 border-none rounded-xl px-4 text-foreground outline-none focus:ring-2 focus:ring-operational-cyan/20 transition-all font-mono font-bold uppercase tracking-widest placeholder:opacity-20"
                placeholder={requiredWord}
                autoFocus
              />
            </div>
          )}
        </div>

        <AlertDialogFooter className="gap-4 mt-2">
          {!isLoading && (
            <AlertDialogCancel
              variant="ghost"
              className="flex-1 h-12 rounded-xl border-none bg-surface-container-high hover:bg-surface-container-highest text-label-xs font-bold uppercase transition-all"
              disabled={isLoading}
            >
              {customCancelText || t('actions.cancel')}
            </AlertDialogCancel>
          )}
          <Button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            aria-label={isLoading ? t('loading') : (customConfirmText || t('actions.confirm'))}
            aria-busy={isLoading}
            className={cn(
              "flex-1 h-12 rounded-xl text-label-xs font-bold uppercase transition-all shadow-lg active:scale-95 disabled:opacity-30 disabled:grayscale",
              BUTTON_STYLES[variant]
            )}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              customConfirmText || t('actions.confirm')
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
