'use client';

import { useTranslations, useLocale } from 'next-intl';
import { isDocumentLocked, type DocumentStatus } from '@logirest/shared-types';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { useGRN } from '@/features/purchasing/hooks/useGRN';
import { useAuth } from '@/providers/AuthProvider';

import { GRNForm } from '@/features/purchasing/components/grn-form';
import { GRNViewer, type GRNViewerDocument } from './GRNViewer';
import { Button } from '@/components/ui/button';

import { Send, Scan, Trash2, CheckCircle2, Ban } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { GRN_STATUS } from '@logirest/shared-types';
import { useDeleteGRN } from '@/features/purchasing/hooks/useDeleteGRN';
import { useSubmitGRN } from '@/features/purchasing/hooks/useSubmitGRN';
import { useVoidGRN } from '@/features/purchasing/hooks/useVoidGRN';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { canPerformActionV2 } from '@logirest/shared-types';
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
    const { open, handleReload, handleClose, triggerConflict } = useConflictHandler('goods-received', id);
    const submitGRN = useSubmitGRN({ onConflict: triggerConflict });
    const voidGRN = useVoidGRN(id);

    const isNew = id === 'new';
    const { data: grn, isLoading, error } = useGRN(isNew ? null : id);

    if (isLoading) return <PageSkeleton variant="detail" />;
    if (error || (!isNew && !grn)) return <ErrorState onRetry={() => window.location.reload()} />;

    const status = (grn?.status || GRN_STATUS.DRAFT) as DocumentStatus;
    const isLocked = isDocumentLocked('GRN', status);

    const actions = (
        <div className="flex flex-col items-stretch md:items-end w-full md:w-auto gap-2">
            {/* Scan Mode — always visible */}
            {isLocked ? (
                <span className="text-[10px] md:text-xs font-bold text-[#b48e67] tracking-widest uppercase truncate w-full text-center md:text-right">
                    {t('inspect_scan_registers') || 'INSPECT SCAN REGISTER'}
                </span>
            ) : (
                <Button
                    onClick={() => router.push(`/goods-received/${id}/scan-mode`)}
                    variant="outline"
                    className="w-full md:w-auto h-10 px-6 text-label-xs font-semibold uppercase rounded-lg transition-all flex items-center justify-center border-primary/20 text-primary hover:bg-primary/5"
                >
                    <Scan className="w-4 h-4 me-2" />
                    {t('scan_mode')}
                </Button>
            )}

            {/* DRAFT: Submit for Receipt */}
            {status === GRN_STATUS.DRAFT && !isNew && (
                <ActionGuard documentType="GRN" status={status} action="SUBMIT" role={user?.role}>
                    <PermissionGate action="submit" resource="grn">
                        <Button
                            onClick={async () => {
                                if (grn?.version === undefined) return;
                                try {
                                    await submitGRN.mutateAsync({ id, version: grn.version });
                                    toast.success(t('submit_success') || 'GRN submitted for receipt review');
                                } catch (err) {
                                    console.error('[GRNDetailClient] Submit failed:', err);
                                }
                            }}
                            disabled={submitGRN.isPending}
                            className="w-full md:w-auto h-10 px-6 bg-operational-cyan hover:brightness-110 text-white text-label-xs font-semibold uppercase rounded-lg shadow-md shadow-operational-cyan/20 transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                            <CheckCircle2 className="w-4 h-4 me-2" />
                            {submitGRN.isPending ? tCommon('saving') : (t('submit_for_receipt') || 'Submit for Receipt')}
                        </Button>
                    </PermissionGate>
                </ActionGuard>
            )}

            {/* DRAFT: Delete */}
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
                        className="w-full md:w-auto bg-red-500/10 text-red-500 hover:bg-red-500/20 h-10 px-6 rounded-lg transition-all font-bold uppercase text-label-xs border border-red-500/20 flex items-center justify-center"
                    >
                        <Trash2 className="w-4 h-4 me-2" />
                        {tCommon('actions.delete') || 'Delete'}
                    </Button>
                </PermissionGate>
            )}

            {/* RECEIVED: Post GRN */}
            <PermissionGate action="post" resource="procurement_grn">
                <ActionGuard documentType="GRN" status={status} action="POST" role={user?.role}>
                    <button
                        onClick={() => router.push(`/goods-received/${id}/post`)}
                        className="w-full md:w-auto px-6 py-2.5 bg-[#b48e67] text-[#0B1220] font-bold rounded-lg shadow-md hover:bg-[#b5952f] transition-all flex justify-center items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        {t('post_grn')}
                    </button>
                </ActionGuard>
            </PermissionGate>

            {/* POSTED / VOIDED: Void */}
            {canPerformActionV2('GRN', status, 'VOID', user?.role) && (
                <Button
                    variant="destructive"
                    size="sm"
                    disabled={voidGRN.isPending}
                    className="w-full md:w-auto h-10 px-6 text-label-xs font-semibold uppercase rounded-lg transition-all flex items-center justify-center"
                    onClick={() => {
                        if (window.confirm(tCommon('void_warning_description') || 'Are you sure you want to void this document?')) {
                            voidGRN.mutate({ version: grn?.version ?? 1 });
                        }
                    }}
                >
                    <Ban className="w-4 h-4 me-2" />
                    {voidGRN.isPending ? tCommon('saving') : tCommon('actions.void') || 'Void Document'}
                </Button>
            )}
        </div>
    );

    const isLockedForView = ['POSTED', 'VOIDED', 'CANCELLED', 'RECEIVED'].includes(status);

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
                        supplierName: grn.supplier?.name,
                        warehouseName: grn.warehouseName,
                        poNumber: grn.poNumber ?? null,
                        lines: grn.lines.map(l => ({
                            id: l.id,
                            documentId: '',
                            itemId: l.item.id,
                            item: {
                                id: l.item.id,
                                code: l.item.code,
                                name: l.item.name,
                                primaryUom: {
                                    id: l.item.primaryUom.id,
                                    code: l.item.primaryUom.code,
                                    name: '',
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
