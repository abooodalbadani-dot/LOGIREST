"use client";

import { useTransfer } from '@/features/operations/hooks/useTransfer';
import { TransferNewClient } from '../new/TransferNewClient';
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
 if (!transfer) return null;

 const transferStatus = transfer.transferStatus ?? TRANSFER_STATUS.DRAFT;

 if (transferStatus === TRANSFER_STATUS.DRAFT) {
  return (
   <ScopeGuard warehouseId={transfer.fromWarehouseId}>
    <TransferNewClient 
     initialData={transfer} 
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

 const targetScope = activeWarehouseId === transfer.toWarehouseId
  ? transfer.toWarehouseId
  : transfer.fromWarehouseId;

 return (
  <ScopeGuard warehouseId={targetScope}>
   <TransferViewer transfer={transfer} />
  </ScopeGuard>
 );
}
