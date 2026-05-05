"use client";

import { useTranslations } from 'next-intl';
import { useTransfer } from '@/features/operations/hooks/useTransfer';
import { isDocumentLocked, type DocumentStatus } from '@/core/workflow/document-engine';
import { TransferForm } from '@/features/operations/components/transfer-form';
import { TransferViewer } from '@/features/operations/components/transfer-viewer';

import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';

export function TransferDetailClient({ id }: { id: string }) {
  const t = useTranslations('operations.transfer');
  const { data: transfer, isLoading } = useTransfer(id);
  const conflict = useConflictHandler('transfer', id);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin" />
          <span className="text-headline-lg font-semibold text-cyan-500">TRN</span>
        </div>
        <div className="text-label-xs font-semibold uppercase text-cyan-500 animate-pulse">
          {t('retrieving_manifest')}
        </div>
      </div>
    );
  }

  const transferStatus = transfer?.transfer_status ?? 'DRAFT';
  const isDocLocked = isDocumentLocked("TRANSFER", transferStatus as DocumentStatus);

  if (isDocLocked && transfer) {
    return <TransferViewer transfer={transfer} />;
  }

  return (
    <>
      <TransferForm 
        transfer={transfer} 
        id={id} 
        onConflict={conflict.triggerConflict}
      />
      <ConflictDialog 
        open={conflict.open}
        onClose={conflict.handleClose}
        onReload={conflict.handleReload}
      />
    </>
  );
}
