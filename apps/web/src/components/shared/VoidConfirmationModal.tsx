'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Ban, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface VoidConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  isLoading?: boolean;
}

export function VoidConfirmationModal({
  isOpen,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: VoidConfirmationModalProps) {
  const t = useTranslations('common');

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      // Error is expected to be handled by the mutation or caller
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-2xl mx-auto p-6 rounded-[1.5rem] bg-card border border-slate-800 shadow-2xl text-slate-100">
        <DialogHeader className="flex flex-col gap-3 mb-4">
          <DialogTitle className="flex items-center gap-2 text-red-500 font-bold text-lg pe-8">
            <Ban className="w-5 h-5" />
            {t('actions.void') || 'Void Document'}
          </DialogTitle>
          <DialogDescription className="text-body-md font-medium text-slate-400 leading-relaxed uppercase">
            {t('void_warning_description') ||
              'This operation is irreversible. This will offset inventory ledgers, adjust cost balances, and lock the document.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <Button
            variant="ghost"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto h-12 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-label-xs font-bold uppercase transition-all border-none"
          >
            {t('actions.cancel') || 'Cancel'}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto h-12 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white text-label-xs font-bold uppercase transition-all shadow-sm shadow-red-600/20 disabled:opacity-30"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t('actions.confirm') || 'Confirm Void'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
