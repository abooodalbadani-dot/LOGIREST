'use client';

import { useTranslations } from 'next-intl';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentExportMenu } from '@/components/shared/DocumentExportMenu';
import { WorkflowActionBar } from '@/components/shared/WorkflowActionBar';
import { DocumentLineItemTable, getLineUomDisplay } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { ArrowLeft, Truck, PackageCheck } from 'lucide-react';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { TransferLine } from '@/features/operations/hooks/useTransfer';
import { useLocale } from '@/hooks/useLocale';
import { useRouter } from '@/i18n/navigation';
import { TRANSFER_STATUS, type DocumentStatus } from '@logirest/shared-types';
import type { Transfer } from '@/types/documents';
import { VoidButton } from '@/components/shared/VoidButton';
import { useReceiveTransfer } from '@/features/operations/hooks/useReceiveTransfer';
import { useCancelTransfer } from '@/features/operations/hooks/useCancelTransfer';
import { useAuth } from '@/providers/AuthProvider';

interface TransferViewerProps {
    transfer: Transfer;
}

export function TransferViewer({ transfer }: TransferViewerProps) {
    const t = useTranslations('operations.transfer');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const { user } = useAuth();
    const { locale } = useLocale();

    const transferStatus = transfer?.transferStatus ?? TRANSFER_STATUS.DRAFT;

    const receiveMutation = useReceiveTransfer();
    const cancelMutation = useCancelTransfer();

    const handleConfirmReceipt = async () => {
        const linesReceived = (transfer?.lines ?? []).map((line) => ({
            lineId: line.id,
            quantityReceived: line.shippedQty ?? line.qty,
        }));
        await receiveMutation.mutateAsync({
            id: transfer.id,
            body: {
                version: transfer.version || 1,
                linesReceived,
            },
        });
    };

    const handleCancelTransfer = async () => {
        await cancelMutation.mutateAsync({
            id: transfer.id,
            version: transfer.version || 1,
        });
    };

    return (
        <div className="flex flex-col flex-1 w-full max-w-full min-w-0 overflow-x-hidden p-3 sm:p-8 mx-auto space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-card border border-border shadow-sm/50 p-4 md:p-6 pb-6 md:pb-6 rounded-2xl relative overflow-visible shadow-xl w-full mb-2 h-auto min-h-min flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 w-full">
                    <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 w-full min-w-0">
                            <button onClick={() => router.back()} className="p-2 -ms-2 hover:bg-surface-container-high rounded-full transition-colors text-muted-foreground hover:text-foreground shrink-0">
                                <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                            </button>
                            <div className="w-full overflow-x-auto whitespace-nowrap no-scrollbar flex items-center gap-2 pb-1">
                                <Breadcrumb
                                    items={[
                                        { label: tCommon('modules.operations'), href: `/transfers` },
                                        { label: t('title'), href: `/transfers` },
                                        { label: t('detail_title') }
                                    ]}
                                />
                            </div>
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tight"><span className="text-foreground">TRANSFER</span> <span className="text-brand-gold">DETAILS</span></h1>
                        <p className="text-sm font-medium text-muted-foreground">DOCUMENT NO: <span className="text-operational-cyan">{transfer?.documentNumber}</span></p>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-start md:justify-end gap-3 mt-4 md:mt-0 w-full md:w-auto">
                        <WorkflowActionBar
                            documentType="TRANSFER"
                            status={transferStatus as DocumentStatus}
                            documentCreatorId={transfer.createdById || transfer.createdBy}
                            currentUserId={user?.id}
                            userRole={user?.role}
                            onReceive={handleConfirmReceipt}
                            isReceivePending={receiveMutation.isPending}
                            onCancel={handleCancelTransfer}
                            isCancelPending={cancelMutation.isPending}
                            extraActions={
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={transferStatus as BadgeStatus} />
                                    <DocumentExportMenu
                                        documentType="TRANSFER"
                                        documentId={transfer.id}
                                        documentNumber={transfer.documentNumber}
                                    />
                                    <VoidButton
                                        documentId={transfer.id}
                                        documentType="TRANSFER"
                                        status={transferStatus}
                                        version={transfer.version || 1}
                                    />
                                </div>
                            }
                            className="border-none shadow-none p-0 bg-transparent"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 bg-card border-y border-x-0 sm:border border-border shadow-sm px-4 py-5 sm:p-6 rounded-none sm:rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500/50 via-cyan-500/20 to-transparent" />

                <div className="col-span-1 flex flex-col gap-1 px-3 py-2.5 rounded-xl bg-surface-container-highest/20">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 ms-0.5">{t('from_warehouse')}</label>
                    <div className="font-bold text-sm text-foreground break-words not-italic ms-0.5">
                        {transfer?.fromWarehouseName}
                    </div>
                </div>

                <div className="col-span-1 flex flex-col gap-1 px-3 py-2.5 rounded-xl bg-surface-container-highest/20">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 ms-0.5">{t('to_warehouse')}</label>
                    <div className="font-bold text-sm text-foreground break-words not-italic ms-0.5">
                        {transfer?.toWarehouseName}
                    </div>
                </div>

                {transfer?.shippedAt && (
                    <div className="col-span-1 flex flex-col gap-1 px-3 py-2.5 rounded-xl bg-surface-container-highest/20 relative overflow-hidden group">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 ms-0.5">{t('shipped_at')}</label>
                        <div className="font-semibold text-sm text-foreground flex items-center justify-between ms-0.5">
                            <ClientOnlyTime
                                date={transfer.shippedAt}
                                mode="datetime"
                                className="font-mono text-xs truncate"
                            />
                            <Truck className="w-3.5 h-3.5 shrink-0 text-foreground/20 absolute bottom-3 end-3 group-hover:text-foreground/40 transition-colors" />
                        </div>
                    </div>
                )}

                {transfer?.receivedAt && (
                    <div className="col-span-1 flex flex-col gap-1 px-3 py-2.5 rounded-xl bg-surface-container-highest/20 relative overflow-hidden group">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 ms-0.5">{t('received_at')}</label>
                        <div className="font-semibold text-sm text-foreground flex items-center justify-between ms-0.5">
                            <ClientOnlyTime
                                date={transfer.receivedAt}
                                mode="datetime"
                                className="font-mono text-xs truncate"
                            />
                            <PackageCheck className="w-3.5 h-3.5 shrink-0 text-foreground/20 absolute bottom-3 end-3 group-hover:text-foreground/40 transition-colors" />
                        </div>
                    </div>
                )}

                <div className="col-span-2 md:col-span-4 flex flex-col gap-1 px-3 py-2.5 rounded-xl bg-surface-container-highest/20">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 ms-0.5">{tCommon('notes')}</label>
                    <div className="font-semibold text-sm text-foreground break-words not-italic ms-0.5">
                        {transfer?.notes || '—'}
                    </div>
                </div>

                {transfer?.varianceReason && (
                    <div className="col-span-2 md:col-span-4 flex flex-col gap-1 px-3 py-2.5 rounded-xl bg-status-warning/10 border border-status-warning/20">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-status-warning ms-0.5">{t('variance_reason')}</label>
                        <div className="font-bold text-sm text-status-warning break-words not-italic ms-0.5">
                            {transfer.varianceReason}
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full max-w-full min-w-0">
                <div className="hidden md:block">
                    <DocumentLineItemTable<TransferLine>
                        lines={(transfer?.lines ?? []) as unknown as TransferLine[]}
                        isReadOnly={true}
                        enableVirtualization={false}
                        onRemoveLine={() => { }}
                        hideLotColumns={true}
                        headers={{
                            code: tCommon('table_headers.code'),
                            name: tCommon('table_headers.name'),
                            qty: t('transfer_qty'),
                            uom: tCommon('table_headers.uom'),
                        }}
                        extraColumns={[
                            {
                                header: t('shipped_qty'),
                                cell: (line: TransferLine) => (
                                    <div className="flex justify-center">
                                        <span dir="ltr" className="font-mono text-body-md font-semibold bg-surface-container-highest px-3 py-1 rounded-xl">
                                            {line.shippedQty ?? line.qty}
                                        </span>
                                    </div>
                                ),
                            },
                            {
                                header: t('received_qty'),
                                cell: (line: TransferLine) => (
                                    <div className="flex justify-center">
                                        <span dir="ltr" className={`font-mono text-body-md font-semibold px-3 py-1 rounded-xl ${line.receivedQty ? 'bg-emerald-500/10 text-emerald-400' : 'bg-surface-container-highest text-muted-foreground/40'}`}>
                                            {line.receivedQty ?? '—'}
                                        </span>
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>

                {/* Mobile Card Protocol */}
                <div className="flex flex-col gap-3 md:hidden mt-4">
                    {(transfer?.lines ?? []).map((line) => (
                        <div key={line.id} className="bg-card border border-border/60 shadow-sm rounded-xl overflow-hidden flex flex-col transition-colors">
                            {/* Item Identity */}
                            <div className="flex gap-3 items-center border-b border-border/40 pb-3 p-4">
                                {((line.item as { image?: string | null; imageUrl?: string | null })?.image || (line.item as { image?: string | null; imageUrl?: string | null })?.imageUrl) ? (
                                    <img src={((line.item as { image?: string | null; imageUrl?: string | null })?.image || (line.item as { image?: string | null; imageUrl?: string | null })?.imageUrl)!} alt="Product" className="w-12 h-12 object-cover rounded-lg border border-border/50 bg-muted/20" />
                                ) : (
                                    <div className="w-12 h-12 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-center text-[10px] font-mono text-muted-foreground uppercase">
                                        N/A
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-foreground">
                                        {locale === 'ar' ? (line.item?.nameAr || line.item?.name || line.item?.nameEn) : (line.item?.nameEn || line.item?.name || line.item?.nameAr)}
                                    </span>
                                    <span className="text-[10px] text-brand-gold font-mono tracking-widest mt-0.5">{line.item?.code || 'ITM-000'}</span>
                                </div>
                            </div>

                            {/* Qty Grid */}
                            <div className="grid grid-cols-3 gap-px bg-border/40">
                                <div className="flex flex-col bg-card p-3 text-center">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t('transfer_qty')}</span>
                                    <span className="text-xs font-bold text-foreground" dir="ltr">{line.qty} {getLineUomDisplay(line)}</span>
                                </div>
                                <div className="flex flex-col bg-card p-3 text-center">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t('shipped_qty')}</span>
                                    <span className="text-xs font-bold text-foreground" dir="ltr">{line.shippedQty ?? line.qty}</span>
                                </div>
                                <div className="flex flex-col bg-surface/50 dark:bg-surface-container-low/30 p-3 text-center">
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">{t('received_qty')}</span>
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">{line.receivedQty ?? '—'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
