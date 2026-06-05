"use client";

import { useTransfer } from '@/features/operations/hooks/useTransfer';
import { isDocumentLocked, type DocumentStatus } from '@logirest/shared-types';
import { TransferForm } from '@/features/operations/components/transfer-form';
import { TransferViewer } from '@/features/operations/components/transfer-viewer';
import { TRANSFER_STATUS } from '@logirest/shared-types';

import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';

import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ScopeGuard } from '@/components/shared/ScopeGuard';
import { useOperationalScope } from '@/hooks/useOperationalScope';

export function TransferDetailClient({ id }: { id: string }) {
  const { warehouseId: activeWarehouseId } = useOperationalScope();
  const { data: transfer, isLoading } = useTransfer(id);
  const conflict = useConflictHandler('transfer', id);

  if (isLoading) return <PageSkeleton variant="detail" />;

  const transferStatus = transfer?.transferStatus ?? TRANSFER_STATUS.DRAFT;
  const isDocLocked = isDocumentLocked("TRANSFER", transferStatus as DocumentStatus);

  if (isDocLocked && transfer) {
    const targetScope = activeWarehouseId === transfer.toWarehouseId
      ? transfer.toWarehouseId
      : transfer.fromWarehouseId;
    return (
      <ScopeGuard warehouseId={targetScope}>
        <TransferViewer transfer={transfer} />
      </ScopeGuard>
    );
  }

  if (!transfer) return null;

  return (
    <ScopeGuard warehouseId={transfer.fromWarehouseId}>
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
    </ScopeGuard>
  );
}
