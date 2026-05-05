'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCcw, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface ConflictDialogProps {
  open: boolean;
  onReload: () => void;
  onClose: () => void;
}

/**
 * ConflictDialog - UI for handling optimistic locking conflicts.
 */
export function ConflictDialog({ open, onReload, onClose }: ConflictDialogProps) {
  const tc = useTranslations('common');

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl bg-surface-container-lowest overflow-hidden">
        <DialogHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-status-warning/10 flex items-center justify-center animate-bounce-subtle">
            <AlertTriangle className="w-8 h-8 text-status-warning" />
          </div>
          <div className="space-y-2 text-center">
            <DialogTitle className="text-title-lg font-bold text-foreground">
              {tc('conflict.title')}
            </DialogTitle>
            <DialogDescription className="text-body-md text-muted-foreground">
              {tc('conflict.description')}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl h-12 font-bold uppercase text-label-xs border-surface-variant/20 hover:bg-surface-container-high transition-all"
          >
            <X className="w-4 h-4 me-2" />
            {tc('cancel')}
          </Button>
          <Button
            onClick={onReload}
            className="flex-1 rounded-xl h-12 font-bold uppercase text-label-xs bg-status-warning hover:bg-status-warning/90 text-white shadow-lg shadow-status-warning/20 transition-all active:scale-95"
          >
            <RefreshCcw className="w-4 h-4 me-2" />
            {tc('conflict.reload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
