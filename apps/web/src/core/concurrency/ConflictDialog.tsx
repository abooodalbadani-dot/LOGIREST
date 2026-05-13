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
import { ConflictError } from '@/lib/api/ConflictError';

export interface ConflictDialogProps {
  open: boolean;
  error?: ConflictError | null;
  onRetry?: () => Promise<void>;
  onReload: () => void;
  onClose: () => void;
  isRetrying?: boolean;
  retryCount?: number;
}

/**
 * ConflictDialog - UI for handling optimistic locking conflicts.
 *
 * "Stay & Disable" behavior (FR-007):
 * - Closing the dialog without reloading marks the form as "save disabled".
 * - The parent component uses `useConflictHandler().saveDisabled` to keep
 *   the Save button disabled until the user chooses "Reload".
 * - Reloading re-fetches fresh data and clears the save-disabled flag.
 */
export function ConflictDialog({ 
  open, 
  error,
  onRetry,
  onReload, 
  onClose, 
  isRetrying,
  retryCount = 0 
}: ConflictDialogProps) {
  const tc = useTranslations('common');

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl bg-surface-container-lowest overflow-hidden">
        <DialogHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-status-warning/10 flex items-center justify-center animate-bounce-subtle">
            <AlertTriangle className="w-8 h-8 text-status-warning" />
          </div>
          <div className="space-y-2 text-center">
            <DialogTitle className="text-title-lg font-bold text-foreground">
              {tc('conflict.title')}
            </DialogTitle>
            <DialogDescription className="text-body-md text-muted-foreground">
              {tc('conflict.description')} {
                error?.updatedBy && (
                  <span className="block mt-2 font-medium text-foreground">
                    {tc('conflict.updated_by')}: {error.updatedBy}
                  </span>
                )
              }
            </DialogDescription>
          </div>
          <p className="text-label-xs text-muted-foreground/60 text-center italic">
            {retryCount >= 1 
              ? tc('conflict.force_reload_hint')
              : tc('conflict.retry_hint')
            }
          </p>
        </DialogHeader>
        <DialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRetrying}
            className="flex-1 rounded-xl h-12 font-bold uppercase text-label-xs hover:bg-surface-container-high transition-all"
          >
            <X className="w-4 h-4 me-2" />
            {tc('conflict.stay')}
          </Button>
          
          {retryCount < 1 && onRetry && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              className="flex-1 rounded-xl h-12 font-bold uppercase text-label-xs bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80 transition-all active:scale-95"
            >
              <RefreshCcw className={`w-4 h-4 me-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {tc('conflict.retry')}
            </Button>
          )}

          <Button
            onClick={onReload}
            disabled={isRetrying}
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
