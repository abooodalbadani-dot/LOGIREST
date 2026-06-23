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
  <div className="flex flex-col flex-1 w-full max-w-full min-w-0 overflow-x-hidden p-4 sm:p-6 md:p-8 pb-32 md:pb-8 mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
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
      <span>{tCommon('doc_number')}</span>
      <span dir="ltr" className="font-mono text-foreground/80">{transfer?.documentNumber}</span>
     </div>
    }
    children={
     <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
      <StatusBadge status={transferStatus as BadgeStatus} />
      <DocumentExportMenu />
     </div>
    }
   />

   <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 bg-card border border-border shadow-sm/50 p-4 sm:p-6 md:p-8 rounded-2xl border border-white/5 relative overflow-hidden shadow-2xl">
    <div className={`absolute top-0 inset-x-0 h-1 ${locale === 'ar' ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-cyan-500/50 via-cyan-500/20 to-transparent`} />

    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-muted/20 border border-border/30">
     <label className="text-[10px] font-semibold uppercase text-muted-foreground/60">{t('from_warehouse')}</label>
     <div className="font-semibold text-body-md text-foreground break-words">
      {transfer?.fromWarehouseName}
     </div>
    </div>

    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-muted/20 border border-border/30">
     <label className="text-[10px] font-semibold uppercase text-muted-foreground/60">{t('to_warehouse')}</label>
     <div className="font-semibold text-body-md text-foreground break-words">
      {transfer?.toWarehouseName}
     </div>
    </div>

    {transfer?.shippedAt && (
     <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-muted/20 border border-border/30 relative overflow-hidden group">
      <label className="text-[10px] font-semibold uppercase text-muted-foreground/60">{t('shipped_at')}</label>
      <div className="font-medium text-body-md text-foreground flex items-center justify-between">
       <ClientOnlyTime 
        date={transfer.shippedAt} 
        mode="datetime" 
        className="font-mono text-sm"
       />
       <Truck className="w-4 h-4 shrink-0 text-foreground/20 absolute bottom-4 end-4 group-hover:text-foreground/40 transition-colors" />
      </div>
     </div>
    )}

    {transfer?.receivedAt && (
     <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-muted/20 border border-border/30 relative overflow-hidden group">
      <label className="text-[10px] font-semibold uppercase text-muted-foreground/60">{t('received_at')}</label>
      <div className="font-medium text-body-md text-foreground flex items-center justify-between">
       <ClientOnlyTime 
        date={transfer.receivedAt} 
        mode="datetime" 
        className="font-mono text-sm"
       />
       <PackageCheck className="w-4 h-4 shrink-0 text-foreground/20 absolute bottom-4 end-4 group-hover:text-foreground/40 transition-colors" />
      </div>
     </div>
    )}

    <div className="col-span-1 md:col-span-4 flex flex-col gap-1.5 p-4 rounded-xl bg-muted/20 border border-border/30">
     <label className="text-[10px] font-semibold uppercase text-muted-foreground/60">{tCommon('notes')}</label>
     <div className="font-medium text-body-md text-foreground/80 min-h-[40px] break-words">
      {transfer?.notes || '—'}
     </div>
    </div>

    {transfer?.varianceReason && (
     <div className="col-span-1 md:col-span-4 flex flex-col gap-1.5 p-4 rounded-xl bg-status-warning/5 border border-status-warning/20">
      <label className="text-[10px] font-semibold uppercase text-status-warning/80">{t('variance_reason')}</label>
      <div className="font-medium text-body-md text-status-warning break-words">
       {transfer.varianceReason}
      </div>
     </div>
    )}
   </div>

    <div className="w-full max-w-full min-w-0 overflow-x-auto border border-border/50 rounded-lg custom-scrollbar">
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
      renderQty={(line) => (
       <div className="flex justify-center">
        <div className="px-3 py-1 font-mono font-bold text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1A2234] rounded-lg">
         {line.qty}
        </div>
       </div>
      )}
      extraColumns={[
       {
        header: t('shipped_qty'),
        cell: (line: TransferLine) => (
         <div className="flex justify-center">
          <span dir="ltr" className="font-mono text-xs font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1A2234] px-3 py-1 rounded-lg">
           {line.shippedQty ?? line.qty}
          </span>
         </div>
        ),
       },
       {
        header: t('received_qty'),
        cell: (line: TransferLine) => (
         <div className="flex justify-center">
          <span dir="ltr" className={`font-mono text-xs font-bold px-3 py-1 rounded-lg border ${line.receivedQty ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1A2234]'}`}>
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
   <div className="bg-card border border-border shadow-sm p-4 sm:p-6 md:p-8 rounded-2xl border border-white/5 shadow-sm transition-all overflow-x-auto">
    <div className="flex items-center gap-3 mb-6 sm:mb-10">
     <History className="w-4 h-4 text-primary opacity-20 shrink-0" />
     <h3 className="text-label-xs font-semibold uppercase text-primary/30">{tCommon('audit_trail')}</h3>
    </div>
    <StatusTimeline entries={timelineEntries} />
   </div>
  </div>
 );
}
