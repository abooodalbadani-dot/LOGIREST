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
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex items-center justify-between">
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
          className="text-label-xs font-semibold uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3 me-2" />
          {tCommon('back')}
        </Button>
      </div>

      <PageHeader
        title={t('detail_title')}
        description={
          <div className="flex items-center gap-2">
            <span>{tCommon('doc_number')}</span>
            <span dir="ltr" className="font-mono text-cyan-500/80">{transfer?.documentNumber}</span>
          </div>
        }
        actions={
          <div className="flex gap-4 items-center">
            <StatusBadge status={transferStatus as BadgeStatus} />
            <DocumentExportMenu />
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 bg-surface-container-low/50 p-8 rounded-2xl border border-white/5 relative overflow-hidden shadow-2xl">
        <div className={`absolute top-0 inset-x-0 h-1 ${locale === 'ar' ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-cyan-500/50 via-cyan-500/20 to-transparent`} />

        <div className="space-y-2">
          <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{t('from_warehouse')}</label>
          <div className="bg-surface-container-highest/40 border border-white/5 rounded-xl p-4 font-bold text-body-md">
            {transfer?.fromWarehouseName}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{t('to_warehouse')}</label>
          <div className="bg-surface-container-highest/40 border border-white/5 rounded-xl p-4 font-bold text-body-md">
            {transfer?.toWarehouseName}
          </div>
        </div>

        {transfer?.shippedAt && (
          <div className="space-y-2">
            <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{t('shipped_at')}</label>
            <div className="bg-surface-container-highest/30 border border-white/5 rounded-xl p-4 flex items-center justify-between">
              <ClientOnlyTime 
                date={transfer.shippedAt} 
                mode="datetime" 
                className="font-mono text-body-md font-bold text-cyan-500/80"
              />
              <Truck className="w-4 h-4 text-cyan-500/40" />
            </div>
          </div>
        )}

        {transfer?.receivedAt && (
          <div className="space-y-2">
            <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{t('received_at')}</label>
            <div className="bg-surface-container-highest/30 border border-white/5 rounded-xl p-4 flex items-center justify-between">
              <ClientOnlyTime 
                date={transfer.receivedAt} 
                mode="datetime" 
                className="font-mono text-body-md font-bold text-emerald-500/80"
              />
              <PackageCheck className="w-4 h-4 text-emerald-500/40" />
            </div>
          </div>
        )}

        <div className="col-span-1 md:col-span-4 space-y-2">
          <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{tCommon('notes')}</label>
          <div className="bg-surface-container-highest/40 border border-white/5 rounded-xl p-4 font-medium text-body-md min-h-[60px]">
            {transfer?.notes || '—'}
          </div>
        </div>

        {transfer?.varianceReason && (
          <div className="col-span-1 md:col-span-4 space-y-2">
            <label className="text-label-xs font-semibold uppercase text-status-warning/80 ms-1">{t('variance_reason')}</label>
            <div className="bg-status-warning/5 border border-status-warning/20 rounded-xl p-4 font-medium text-body-md">
              {transfer.varianceReason}
            </div>
          </div>
        )}
      </div>

      <div className="bg-surface-container-low/30 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <DocumentLineItemTable
          lines={transfer?.lines ?? []}
          locale={locale as 'ar' | 'en'} 
          isReadOnly={true}
          onRemoveLine={() => {}}
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
                  <span dir="ltr" className="font-mono text-body-md font-semibold bg-surface-container-highest px-3 py-1 rounded-lg border border-white/5">
                    {line.shippedQty ?? line.qty}
                  </span>
                </div>
              ),
            },
            {
              header: t('received_qty'),
              cell: (line: TransferLine) => (
                <div className="flex justify-center">
                  <span dir="ltr" className={`font-mono text-body-md font-semibold px-3 py-1 rounded-lg border border-white/5 ${line.receivedQty ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-surface-container-highest text-muted-foreground/40'}`}>
                    {line.receivedQty ?? '—'}
                  </span>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Audit Trail */}
      <div className="bg-surface-container-lowest p-8 rounded-2xl border border-white/5 shadow-sm transition-all">
        <div className="flex items-center gap-3 mb-10">
          <History className="w-4 h-4 text-primary opacity-20" />
          <h3 className="text-label-xs font-semibold uppercase text-primary/30">{tCommon('audit_trail')}</h3>
        </div>
        <StatusTimeline entries={timelineEntries} />
      </div>
    </div>
  );
}
