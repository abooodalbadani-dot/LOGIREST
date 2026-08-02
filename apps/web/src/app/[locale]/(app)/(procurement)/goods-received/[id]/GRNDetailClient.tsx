'use client';

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { VoidConfirmationModal } from '@/components/shared/VoidConfirmationModal';
import { isDocumentLocked, type DocumentStatus, GRN_STATUS } from '@logirest/shared-types';
import { useGRN } from '@/features/purchasing/hooks/useGRN';
import { useAuth } from '@/providers/AuthProvider';
import { GRNForm } from '@/features/purchasing/components/grn-form';
import { GRNViewer } from './GRNViewer';
import { useRouter } from '@/i18n/navigation';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { useDeleteGRN } from '@/features/purchasing/hooks/useDeleteGRN';
import { useSubmitGRN } from '@/features/purchasing/hooks/useSubmitGRN';
import { useCancelGRN } from '@/features/purchasing/hooks/useCancelGRN';
import { useVoidGRN } from '@/features/purchasing/hooks/useVoidGRN';
import { WorkflowActionBar } from '@/components/shared/WorkflowActionBar';
import { toast } from 'sonner';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { ItemSchema, type Item, UoMSchema, type UoM } from '@/types/master-data';
import { resolveUomCode, isRawUuid } from '@/utils/uom-helper';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

interface GRNDetailClientProps {
  id: string;
}

/**
 * GRNDetailClient - Dispatcher Pattern
 * Switches between GRNForm (Editable) and GRNViewer (Locked/Immutable)
 * Uses WorkflowActionBar for double-gated actions and anti-self-approval protection.
 */
export function GRNDetailClient({ id }: GRNDetailClientProps) {
  const t = useTranslations('procurement.grn');
  const tCommon = useTranslations('common');
  const locale = useLocale() as 'ar' | 'en';
  const router = useRouter();
  const { user } = useAuth();

  const isNew = id === 'new';
  const { data: grn, isLoading, error } = useGRN(isNew ? null : id);
  const { data: itemsData } = useMasterDataList<Item>('items', ItemSchema);
  const { data: uomsData } = useMasterDataList<UoM>('units-of-measure', UoMSchema);

  const { open, handleReload, handleClose, triggerConflict } = useConflictHandler('goods-received', id);
  const deleteGRN = useDeleteGRN();
  const submitGRN = useSubmitGRN({ onConflict: triggerConflict });
  const cancelGRN = useCancelGRN({ onConflict: triggerConflict });
  const voidGRN = useVoidGRN(id);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const saveFormRef = useRef<() => Promise<boolean>>(null);
  const queryClient = useQueryClient();

  if (isLoading) return <PageSkeleton variant="detail" />;
  if (error || (!isNew && !grn)) return <ErrorState onRetry={() => window.location.reload()} />;

  const status = (grn?.status || GRN_STATUS.DRAFT) as DocumentStatus;
  const isLocked = isDocumentLocked('GRN', status);
  const isLockedForView = ['POSTED', 'VOIDED', 'CANCELLED', 'RECEIVED'].includes(status);

  const handleSubmit = async () => {
    if (saveFormRef.current && (!isLocked && !isLockedForView)) {
      const isSaved = await saveFormRef.current();
      if (!isSaved) return;
    }
    const currentGrnData = queryClient.getQueryData<{ version: number }>(['grn', id]);
    const currentVersion = currentGrnData?.version ?? grn?.version;
    if (currentVersion === undefined && !isNew) return;
    try {
      await submitGRN.mutateAsync({ id, version: currentVersion ?? 1 });
      toast.success(t('submit_success') || 'GRN submitted for receipt review');
    } catch (err) {
      console.error('[GRNDetailClient] Submit failed:', err);
    }
  };

  const handleCancel = async () => {
    if (grn?.version === undefined) return;
    try {
      await cancelGRN.mutateAsync({ id, version: grn.version });
      toast.success(tCommon('actions.cancel_success') || 'GRN cancelled successfully');
    } catch (err) {
      console.error('[GRNDetailClient] Cancel failed:', err);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Are you sure you want to delete this draft goods received note? This action is permanent.');
    if (!confirmed) return;
    try {
      await deleteGRN.mutateAsync({ id, version: grn?.version });
      toast.success('Draft goods received note deleted successfully');
      router.push('/goods-received');
    } catch (err) {
      console.error(err);
    }
  };

  const renderActions = () => (
    <WorkflowActionBar
      documentType="GRN"
      status={status}
      documentCreatorId={grn?.createdById || grn?.createdBy}
      currentUserId={user?.id}
      userRole={user?.role}
      onSubmit={handleSubmit}
      isSubmitPending={submitGRN.isPending}
      onPost={() => router.push(`/goods-received/${id}/post`)}
      onCancel={handleCancel}
      isCancelPending={cancelGRN.isPending}
      onDelete={handleDelete}
      isDeletePending={deleteGRN.isPending}
      onVoid={() => setIsVoidModalOpen(true)}
      isVoidPending={voidGRN.isPending}
      className="border-none shadow-none p-0 bg-transparent"
    />
  );

  if (isLocked || isLockedForView) {
    if (!grn) return null;
    return (
      <>
        <GRNViewer
          document={{
            ...grn,
            status: grn.status as DocumentStatus,
            createdAt: grn.createdAt ?? '',
            createdBy: grn.createdBy ?? '',
            updatedAt: grn.updatedAt ?? '',
            fxRateCapturedAt: grn.fxRateCapturedAt ?? null,
            type: 'GRN' as const,
            branchId: '',
            postedAt: null,
            postedBy: null,
            supplierName: grn.supplierName || grn.supplier?.name,
            warehouseName: grn.warehouseName,
            poNumber: grn.poNumber ?? null,
            lines: grn.lines.map(l => {
              const itemImage = (l.item as { image?: string | null; imageUrl?: string | null }).image || (l.item as { image?: string | null; imageUrl?: string | null }).imageUrl || itemsData?.data?.find((i: Item) => i.id === l.item.id)?.image || itemsData?.data?.find((i: Item) => i.id === l.item.id)?.imageUrl || null;
              const lineUom = (l as { uom?: { id: string; code: string; name?: string } }).uom;
              const selectedUom = lineUom || (l.uomId ? uomsData?.data?.find((u: UoM) => u.id === l.uomId) : null);
              const uomCode = resolveUomCode(selectedUom?.id || l.uomId || l.item?.primaryUom?.id, l.item, uomsData?.data, 'PCS');
              const uomName = selectedUom?.name || (!isRawUuid(selectedUom?.code) ? selectedUom?.code : '') || uomCode;
              return {
                id: l.id,
                documentId: '',
                itemId: l.item.id,
                item: {
                  id: l.item.id,
                  code: l.item.code,
                  name: l.item.name,
                  nameAr: l.item.nameAr || l.item.name,
                  nameEn: l.item.nameEn || l.item.name,
                  image: itemImage,
                  imageUrl: itemImage,
                  primaryUom: {
                    id: selectedUom?.id || l.item.primaryUom.id,
                    code: uomCode,
                    name: uomName,
                  },
                },
                uom: lineUom || (selectedUom ? { id: selectedUom.id, code: uomCode, name: uomName } : null),
                lotId: l.lot?.id ?? null,
                lot: l.lot ? { ...l.lot, isExpired: false } : null,
                qty: l.qty,
                uomId: l.uomId,
                unitCost: null,
                poQty: null,
                receivedQty: l.receivedQty,
                unitCostForeign: l.unitCostForeign ?? 0,
                unitCostBase: l.unitCostBase ?? 0,
              };
            }),
          }}
          locale={locale}
          actions={renderActions()}
        />
        <ConflictDialog
          open={open}
          onReload={handleReload}
          onClose={handleClose}
        />
        <VoidConfirmationModal
          isOpen={isVoidModalOpen}
          onOpenChange={setIsVoidModalOpen}
          onConfirm={async () => {
            try {
              await voidGRN.mutateAsync({ version: grn?.version ?? 1 });
              toast.success(tCommon('void_success') || 'Document voided successfully.');
            } catch (err) {
              // Error handled by hook
            }
          }}
          isLoading={voidGRN.isPending}
        />
      </>
    );
  }

  return (
    <>
      <GRNForm
        initialData={grn}
        id={id}
        actions={renderActions()}
        onConflict={triggerConflict}
        onBindSaveForm={(fn) => { saveFormRef.current = fn; }}
      />
      <ConflictDialog
        open={open}
        onReload={handleReload}
        onClose={handleClose}
      />
      <VoidConfirmationModal
        isOpen={isVoidModalOpen}
        onOpenChange={setIsVoidModalOpen}
        onConfirm={async () => {
          try {
            await voidGRN.mutateAsync({ version: grn?.version ?? 1 });
            toast.success(tCommon('void_success') || 'Document voided successfully.');
          } catch (err) {
            // Error handled by hook
          }
        }}
        isLoading={voidGRN.isPending}
      />
    </>
  );
}
