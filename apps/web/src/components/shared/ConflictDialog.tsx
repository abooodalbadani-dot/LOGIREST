'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { AlertTriangle, RefreshCw, Save, X } from 'lucide-react';
import { formatDate } from '@/utils/currency';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { ConflictError } from '@/lib/api/ConflictError';

interface ConflictDialogProps {
  open: boolean;
  error: ConflictError | null;
  onRetry: () => void;
  onReload: () => void;
  onClose: () => void;
  isRetrying?: boolean;
  retryCount: number;
}

export function ConflictDialog({
  open,
  error,
  onRetry,
  onReload,
  onClose,
  isRetrying,
  retryCount,
}: ConflictDialogProps) {
  const t = useTranslations('common.errors.conflict');

  // If retryCount >= 1, we only allow Reload or Cancel to prevent infinite loops
  const canRetry = retryCount === 0;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-md border-none ambient-shadow p-6 bg-surface-container-lowest">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-title-lg font-bold flex items-center gap-2 text-status-warning">
            <AlertTriangle className="w-6 h-6" />
            {t('title')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-body-md text-muted-foreground/70 mt-2">
            {t('description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="my-6 p-4 rounded-xl border bg-status-warning/5 border-status-warning/20 text-status-warning/90 space-y-2">
            {error.updatedBy && (
              <div className="text-label-sm font-medium flex justify-between">
                <span>{t('updated_by')}:</span>
                <span className="font-bold">{error.updatedBy}</span>
              </div>
            )}
            {error.updatedAt && (
              <div className="text-label-sm font-medium flex justify-between">
                <span>{t('updated_at')}:</span>
                <span className="font-bold">{formatDate(error.updatedAt, useLocale() as 'ar' | 'en')}</span>
              </div>
            )}
            <div className="text-label-sm font-medium flex justify-between">
              <span>{t('your_version')}:</span>
              <span className="font-bold opacity-60">{(error as any).originalVersion ?? '?'}</span>
            </div>
            <div className="text-label-sm font-medium flex justify-between">
              <span>{t('server_version')}:</span>
              <span className="font-bold">{error.currentVersion}</span>
            </div>
          </div>
        )}

        <div className="text-label-sm text-muted-foreground italic mb-6">
          {canRetry ? t('retry_hint') : t('force_reload_hint')}
        </div>

        <AlertDialogFooter className="gap-3 mt-4">
          <AlertDialogCancel 
            variant="ghost" 
            className="font-bold rounded-xl hover:bg-surface-container-high"
            onClick={onClose}
            disabled={isRetrying}
          >
            {t('actions.cancel')}
          </AlertDialogCancel>
          
          <Button
            variant="outline"
            onClick={onReload}
            disabled={isRetrying}
            className="font-bold rounded-xl gap-2 border-outline-low hover:bg-surface-container-high"
          >
            <RefreshCw className="w-4 h-4" />
            {t('actions.reload')}
          </Button>

          {canRetry && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              className="bg-primary hover:bg-primary/90 font-bold rounded-xl px-6 min-w-[120px] gap-2 transition-all active:scale-[0.98]"
            >
              {isRetrying ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('actions.retry')}
                </>
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
