'use client';

import * as React from 'react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Ban, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/infrastructure/api/client';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { DocumentStatus } from '@/types/documents';

interface VoidButtonProps {
  documentId: string;
  documentType: 'GRN' | 'ISSUE' | 'ADJUSTMENT' | 'TRANSFER' | 'KITCHEN_REQUEST' | 'STOCKTAKE';
  status: DocumentStatus;
  version: number;
  onSuccess?: () => void;
}

export function VoidButton({
  documentId,
  documentType,
  status,
  version,
  onSuccess,
}: VoidButtonProps) {
  const t = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Map DocumentType to backend parameter
  const backendDocType =
    documentType === 'KITCHEN_REQUEST'
      ? 'kitchen-request'
      : documentType.toLowerCase();

  const handleVoid = async () => {
    if (comment.trim().length < 5) {
      toast.error(t('errors.comment_too_short') || 'Explanation must be at least 5 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post(
        `/operations/${backendDocType}/${documentId}/void`,
        z.unknown(),
        {
          version,
          comment: comment.trim(),
        }
      );
      toast.success(t('void_success') || 'Document voided successfully.');
      setIsOpen(false);
      setComment('');
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t('error_generic') || 'Error voiding document');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ActionGuard
      documentType={documentType}
      status={status}
      action="VOID"
      role={user?.role}
    >
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="destructive"
            className="h-10 px-6 text-label-xs font-semibold uppercase rounded-lg shadow-xl shadow-red-500/10 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
          >
            <Ban className="w-4 h-4" />
            {t('actions.void') || 'Void Document'}
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[90vw] sm:max-w-3xl mx-auto p-6 rounded-[1.5rem] bg-slate-900 border border-slate-800 shadow-2xl">
          <DialogHeader className="flex flex-col gap-3 mb-4">
            <DialogTitle className="flex items-center gap-2 text-red-500 font-bold text-lg pe-8">
              <Ban className="w-5 h-5" />
              {t('actions.void') || 'Void Document'}
            </DialogTitle>
            <DialogDescription className="text-body-md font-medium text-muted-foreground/60 leading-relaxed uppercase">
              {t('void_warning_description') ||
                'This operation is irreversible. This will offset inventory ledgers, adjust cost balances, and lock the document.'}
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-3">
            <label className="text-label-xs font-bold text-muted-foreground/40 uppercase">
              {t('void_reason_prompt') || 'Reason for voiding (minimum 5 characters):'}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('void_reason_placeholder') || 'Enter explanation...'}
              className="bg-card border border-border shadow-sm border-none rounded-xl p-4 text-foreground focus:ring-2 focus:ring-red-500/20 transition-all min-h-[100px]"
              disabled={isLoading}
            />
          </div>
          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="w-full sm:w-auto h-12 px-6 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-label-xs font-bold uppercase transition-all"
            >
              {t('actions.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleVoid}
              disabled={isLoading || comment.trim().length < 5}
              className="w-full sm:w-auto h-12 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-label-xs font-bold uppercase transition-all shadow-sm shadow-red-500/20 disabled:opacity-30 disabled:grayscale"
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
    </ActionGuard>
  );
}
