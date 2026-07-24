'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { Truck, PackageCheck, ArrowLeft, History } from 'lucide-react';
import { DocumentExportMenu } from '@/components/shared/DocumentExportMenu';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { TransferLine, type TransferDetail } from '@/features/operations/hooks/useTransfer';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { TRANSFER_STATUS } from '@logirest/shared-types';

interface TransferViewerProps {
    transfer: TransferDetail;
    locale: 'ar' | 'en';
}

export function TransferViewer({ transfer, locale }: TransferViewerProps) {
    const t = useTranslations('operations.transfer');
    const tCommon = useTranslations('common');
    const router = useRouter();

    const transferStatus = transfer?.transferStatus ?? TRANSFER_STATUS.DRAFT;

    const timelineEntries = [
        { status: 'draft' as Status, at: transfer.createdAt, by: transfer.createdBy || tCommon('system') },
        ...((transfer.transferStatus === 'IN_TRANSIT' || transfer.status === 'IN_TRANSIT' || transfer.status === 'RECEIVED' || transfer.status === 'POSTED') ? [{ status: 'in_transit' as Status, at: transfer.shippedAt || transfer.updatedAt, by: transfer.createdBy || tCommon('system') }] : []),
        ...((transfer.status === 'RECEIVED' || transfer.status === 'POSTED') ? [{ status: 'posted' as Status, at: transfer.receivedAt || transfer.updatedAt, by: transfer.createdBy || tCommon('system') }] : []),
        ...(transfer.status === 'POSTED' ? [{ status: 'posted' as Status, at: transfer.postedAt || transfer.updatedAt, by: transfer.postedBy || tCommon('system') }] : []),
        { status: transfer.status.toLowerCase() as Status, at: transfer.updatedAt || transfer.createdAt, by: tCommon('system') },
    ];

    return (
        <div className="flex flex-col flex-1 w-full max-w-full min-w-0 overflow-x-hidden px-0 py-6 sm:p-6 md:p-8 pb-32 md:pb-8 mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="px-4 sm:px-0 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 w-full max-w-full min-w-0">
                    <Breadcrumb
                        items={[
                            { label: tCommon('modules.operations'), href: `/transfers` },
                            { label: t('title'), href: `/transfers` },
                            { label: t('detail_title') }
                        ]}
                    />
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="text-label-xs font-semibold uppercase text-muted-foreground hover:text-foreground transition-colors border border-border/50 rounded-lg px-4 bg-muted/20 hover:bg-muted/40"
                    >
                        <ArrowLeft className="w-3 h-3 me-2" />
                        {tCommon('back')}
                    </Button>
                </div>

                <PageHeader
                    title={t('detail_title')}
                    subtitle={
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                            <span className="font-semibold">{tCommon('doc_number')}</span>
                            <span dir="ltr" className="font-mono text-foreground/80 font-bold">{transfer?.documentNumber}</span>
                        </div>
                    }
                    children={
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
                            <StatusBadge status={transferStatus as BadgeStatus} />
                            <DocumentExportMenu documentType="TRANSFER" documentId={transfer.id} documentNumber={transfer.documentNumber} />
                        </div>
                    }
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 bg-card border-y border-x-0 sm:border border-border shadow-sm px-4 py-5 sm:p-6 rounded-none sm:rounded-2xl relative overflow-hidden">
                <div className={`absolute top-0 inset-x-0 h-1 ${locale === 'ar' ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-cyan-500/50 via-cyan-500/20 to-transparent`} />

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
                                className="font-mono text-xs"
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
                                className="font-mono text-xs"
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

            <div className="w-full max-w-full min-w-0 overflow-x-auto border-y border-x-0 sm:border border-border/50 rounded-none sm:rounded-lg custom-scrollbar">
                <DocumentLineItemTable
                    lines={transfer?.lines ?? []}
                    locale={locale as 'ar' | 'en'}
                    isReadOnly={true}
                    onRemoveLine={() => { }}
                    hideLotColumns={true}
                    noCollapse={false}
                    headers={{
                        code: tCommon('table_headers.code'),
                        name: tCommon('table_headers.name'),
                        qty: t('transfer_qty'),
                        uom: tCommon('table_headers.uom'),
                    }}
                    renderQty={(line) => (
                        <div className="flex justify-center">
                            <div className="px-3 py-1 font-mono font-bold text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-card rounded-lg">
                                {line.qty}
                            </div>
                        </div>
                    )}
                    extraColumns={[
                        {
                            header: t('shipped_qty'),
                            cell: (line: TransferLine) => (
                                <div className="flex justify-center">
                                    <span dir="ltr" className="font-mono text-xs font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-card px-3 py-1 rounded-lg">
                                        {line.shippedQty ?? line.qty}
                                    </span>
                                </div>
                            ),
                        },
                        {
                            header: t('received_qty'),
                            cell: (line: TransferLine) => (
                                <div className="flex justify-center">
                                    <span dir="ltr" className={`font-mono text-xs font-bold px-3 py-1 rounded-lg border ${line.receivedQty ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-card'}`}>
                                        {line.receivedQty ?? '—'}
                                    </span>
                                </div>
                            ),
                        },
                        {
                            header: tCommon('notes'),
                            cell: (line: TransferLine) => (
                                <div className="flex justify-center">
                                    <span className="text-xs text-[#0B1220] dark:text-gray-300">{line.notes || '—'}</span>
                                </div>
                            ),
                        },
                    ]}
                />
            </div>

            {/* Audit Trail */}
            <div className="bg-card border-y border-x-0 sm:border border-border shadow-sm px-4 py-6 sm:p-8 rounded-none sm:rounded-2xl transition-all overflow-x-auto">
                <div className="flex items-center gap-3 mb-6 sm:mb-10">
                    <History className="w-4 h-4 text-primary opacity-20 shrink-0" />
                    <h3 className="text-xs font-bold uppercase text-primary">{tCommon('audit_trail')}</h3>
                </div>
                <StatusTimeline entries={timelineEntries} />
            </div>
        </div>
    );
}
