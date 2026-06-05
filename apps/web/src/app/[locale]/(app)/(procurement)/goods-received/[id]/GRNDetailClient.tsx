'use client';

import { useTranslations, useLocale } from 'next-intl';
import { isDocumentLocked, type DocumentStatus } from '@logirest/shared-types';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { useGRN } from '@/features/purchasing/hooks/useGRN';
import { useAuth } from '@/providers/AuthProvider';

import { GRNForm } from '@/features/purchasing/components/grn-form';
import { GRNViewer, type GRNViewerDocument } from './GRNViewer';
import { Button } from '@/components/ui/button';
import { VoidButton } from '@/components/shared/VoidButton';
import { Send, Scan, Trash2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { GRN_STATUS } from '@logirest/shared-types';
import { useDeleteGRN } from '@/features/purchasing/hooks/useDeleteGRN';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { toast } from 'sonner';

interface GRNDetailClientProps {
  id: string;
}

import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

/**
 * GRNDetailClient - Dispatcher Pattern
 * Switches between GRNForm (Editable) and GRNViewer (Locked/Immutable)
 */
export function GRNDetailClient({ id }: GRNDetailClientProps) {
  const t = useTranslations('procurement.grn');
  const tCommon = useTranslations('common');
  const locale = useLocale() as 'ar' | 'en';
  const router = useRouter();
  const { user } = useAuth();
  const deleteGRN = useDeleteGRN();
  
  const isNew = id === 'new';
  const { data: grn, isLoading, error } = useGRN(isNew ? null : id);
  const { open, handleReload, handleClose, triggerConflict } = useConflictHandler('goods-received', id);

  if (isLoading) return <PageSkeleton variant="detail" />;
  if (error || (!isNew && !grn)) return <ErrorState onRetry={() => window.location.reload()} />;

  const status = (grn?.status || GRN_STATUS.DRAFT) as DocumentStatus;
  const isLocked = isDocumentLocked('GRN', status);

    const actions = (
      <div className="flex gap-2 items-center">
        {isLocked ? (
          <Button
            onClick={() => router.push(`/goods-received/${id}/scan-mode`)}
            variant="outline"
            className="h-10 px-6 text-label-xs font-semibold uppercase rounded-lg border-status-warning/20 text-status-warning hover:bg-status-warning/5 transition-all"
          >
            <Scan className="w-4 h-4 me-2" />
            {t('inspect_scan_registers')}
          </Button>
        ) : (
          <Button
            onClick={() => router.push(`/goods-received/${id}/scan-mode`)}
            variant="outline"
            className="h-10 px-6 text-label-xs font-semibold uppercase rounded-lg border-primary/20 text-primary hover:bg-primary/5 transition-all"
          >
            <Scan className="w-4 h-4 me-2" />
            {t('scan_mode')}
          </Button>
        )}
        <ActionGuard documentType="GRN" status={status} action="POST" role={user?.role}>
          <Button 
            onClick={() => router.push(`/goods-received/${id}/post`)}
            className="h-10 px-8 primary-gradient text-white text-label-xs font-semibold uppercase shadow-xl shadow-primary/20 transition-all rounded-lg"
          >
            <Send className="w-4 h-4 me-2" />
            {t('post_grn')}
          </Button>
        </ActionGuard>
        {status === GRN_STATUS.DRAFT && !isNew && (
          <PermissionGate action="delete" resource="grn">
            <Button
              onClick={async () => {
                const confirmed = window.confirm('Are you sure you want to delete this draft goods received note? This action is permanent.');
                if (!confirmed) return;
                try {
                  await deleteGRN.mutateAsync({ id, version: grn?.version });
                  toast.success('Draft goods received note deleted successfully');
                  router.push('/goods-received');
                } catch (err) {
                  console.error(err);
                }
              }}
              disabled={deleteGRN.isPending}
              className="bg-red-500/10 text-red-500 hover:bg-red-500/20 h-10 px-6 rounded-lg transition-all font-bold uppercase text-label-xs border border-red-500/20"
            >
              <Trash2 className="w-4 h-4 me-2" />
              {tCommon('actions.delete') || 'Delete'}
            </Button>
          </PermissionGate>
        )}
        <VoidButton
          documentId={id}
          documentType="GRN"
          status={status}
          version={grn?.version || 1}
        />
      </div>
  );

  if (isLocked) {
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
            supplierName: grn.supplier?.name,
            poNumber: grn.poNumber ?? null,
            lines: grn.lines.map(l => ({
              id: l.id,
              documentId: '',
              itemId: l.item.id,
              item: {
                id: l.item.id,
                code: l.item.code,
                nameAr: l.item.nameAr,
                nameEn: l.item.nameEn,
                primaryUom: {
                  id: l.item.primaryUom.id,
                  code: l.item.primaryUom.code,
                  nameAr: '',
                  nameEn: '',
                },
              },
              lotId: l.lot?.id ?? null,
              lot: l.lot ? { ...l.lot, isExpired: false } : null,
              qty: l.qty,
              uomId: l.uomId,
              unitCost: null,
              poQty: null,
              receivedQty: l.receivedQty,
              unitCostForeign: l.unitCostForeign ?? 0,
              unitCostBase: l.unitCostBase ?? 0,
            })),
          }} 
          locale={locale} 
          actions={actions}
        />
        <ConflictDialog 
          open={open}
          onReload={handleReload}
          onClose={handleClose}
        />
      </>
    );
  }

  return (
    <>
      <GRNForm 
        initialData={grn} 
        id={id} 
        actions={actions}
        onConflict={triggerConflict}
              />
      <ConflictDialog 
        open={open}
        onReload={handleReload}
        onClose={handleClose}
      />
    </>
  );
}
