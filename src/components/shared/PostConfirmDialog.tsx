'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';

interface PostConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  warningText?: string;
  requiresTextConfirmation?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  trigger?: React.ReactElement;
  children?: React.ReactNode;
  variant?: 'warning' | 'destructive' | 'default';
  confirmText?: string;
  cancelText?: string;
  confirmKeyword?: string;
  // Support legacy prop name
  isOpen?: boolean;
}

export function PostConfirmDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  isOpen: legacyOpen,
  title,
  description,
  warningText,
  requiresTextConfirmation,
  isLoading,
  onConfirm,
  trigger,
  children,
  variant = 'warning',
  confirmText: customConfirmText,
  cancelText: customCancelText,
  confirmKeyword,
}: PostConfirmDialogProps) {
  const t = useTranslations('common');
  const [internalOpen, setInternalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  
  const open = controlledOpen ?? legacyOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const isRtl = typeof document !== 'undefined' ? document.documentElement.dir === 'rtl' : true;
  const defaultKeyword = isRtl ? 'تأكيد' : 'CONFIRM';
  const requiredWord = confirmKeyword || defaultKeyword;
  const isConfirmDisabled = isLoading || (requiresTextConfirmation && confirmInput !== requiredWord);

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger render={trigger} />}
      <AlertDialogContent className="max-w-md border-none ambient-shadow p-6 bg-surface-container-lowest">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold tracking-tight">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground/70">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className={cn(
          "my-6 p-4 rounded-xl border flex flex-col gap-1.5",
          variant === 'warning' ? "bg-status-warning/5 border-status-warning/20 text-status-warning" : 
          variant === 'destructive' ? "bg-destructive/5 border-destructive/20 text-destructive" :
          "bg-primary/5 border-primary/20 text-primary"
        )}>
          <div className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            {warningText || t('warning')}
          </div>
          <div className="text-xs opacity-70 leading-relaxed font-medium">
            {t('posting_irreversible')}
          </div>
        </div>

        {children}

        {requiresTextConfirmation && (
          <div className="space-y-2 mb-6">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ms-1">
              {t('confirm_word_prompt', { keyword: requiredWord })}
            </label>
            <input 
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              disabled={isLoading}
              className="w-full bg-surface-container border border-outline-low rounded-xl px-4 py-3 text-foreground outline-none focus:border-operational-cyan focus:ring-1 focus:ring-operational-cyan/50 transition-all shadow-inner font-medium"
              autoFocus
            />
          </div>
        )}

        <AlertDialogFooter className="gap-3 mt-4">
          <AlertDialogCancel 
            variant="ghost" 
            className="font-bold rounded-xl hover:bg-surface-container-high"
            disabled={isLoading}
          >
            {customCancelText || t('actions.cancel')}
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={cn(
              "font-bold rounded-xl px-6 min-w-[100px] transition-all active:scale-[0.98]",
              variant === 'destructive' ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
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
