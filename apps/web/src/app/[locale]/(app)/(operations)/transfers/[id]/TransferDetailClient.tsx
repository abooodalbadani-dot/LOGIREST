"use client";

import { useTranslations } from 'next-intl';
import { useTransfer } from '@/features/operations/hooks/useTransfer';
import { isDocumentLocked, type DocumentStatus } from '@/core/workflow/document-engine';
import { TransferForm } from '@/features/operations/components/transfer-form';
import { TransferViewer } from '@/features/operations/components/transfer-viewer';
import { TRANSFER_STATUS } from '@/contracts/statuses';

import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';

import { PageSkeleton } from '@/components/shared/PageSkeleton';

export function TransferDetailClient({ id }: { id: string }) {
  const t = useTranslations('operations.transfer');
  const { data: transfer, isLoading } = useTransfer(id);
  const conflict = useConflictHandler('transfer', id);

  if (isLoading) return <PageSkeleton variant="detail" />;

  const transferStatus = transfer?.transfer_status ?? TRANSFER_STATUS.DRAFT;
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
