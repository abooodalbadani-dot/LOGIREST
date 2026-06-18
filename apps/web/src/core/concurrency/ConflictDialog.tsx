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
      <DialogContent className="sm:max-w-[425px] rounded-2xl overflow-hidden bg-card text-card-foreground border-border shadow-lg">
        <DialogHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-status-warning/10 flex items-center justify-center animate-bounce-subtle">
            <AlertTriangle className="w-8 h-8 text-status-warning" />
          </div>
          <div className="space-y-2 text-center">
            <DialogTitle className="text-lg font-bold text-foreground text-start">
              {tc('conflict.title')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-start text-balance mt-2">
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
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 w-full">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRetrying}
            className="w-full sm:w-auto shrink-0"
          >
            <X className="w-4 h-4 me-2" />
            {tc('conflict.stay')}
          </Button>
          
          <Button
            onClick={onRetry || onReload}
            disabled={isRetrying}
            className="w-full sm:w-auto shrink-0 bg-brand-gold hover:bg-brand-gold-hover text-primary-foreground"
          >
            <RefreshCcw className={`w-4 h-4 me-2 ${isRetrying ? 'animate-spin' : ''}`} />
            {onRetry ? tc('conflict.retry') : tc('conflict.reload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
