'use client';

import { useTranslations } from 'next-intl';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentExportMenu } from '@/components/shared/DocumentExportMenu';
import { StickyGlassHeader } from '@/components/shared/StickyGlassHeader';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { ArrowLeft, Truck, PackageCheck, Loader2 } from 'lucide-react';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { TransferLine } from '@/features/operations/hooks/useTransfer';
import { useLocale } from '@/hooks/useLocale';
import { useRouter } from '@/i18n/navigation';
import { TRANSFER_STATUS } from '@logirest/shared-types';
import type { Transfer } from '@/types/documents';
import { VoidButton } from '@/components/shared/VoidButton';
import { Button } from '@/components/ui/button';
import { useReceiveTransfer } from '@/features/operations/hooks/useReceiveTransfer';
import { PermissionGate } from '@/components/shared/PermissionGate';

interface TransferViewerProps {
 transfer: Transfer;
}

export function TransferViewer({ transfer }: TransferViewerProps) {

 const t = useTranslations('operations.transfer');
 const tCommon = useTranslations('common');
 const router = useRouter();
 const { gradientClass } = useLocale();

 const transferStatus = transfer?.transferStatus ?? TRANSFER_STATUS.DRAFT;

 const receiveMutation = useReceiveTransfer();

 const handleConfirmReceipt = () => {
  const linesReceived = (transfer?.lines ?? []).map((line) => ({
   lineId: line.id,
   quantityReceived: line.shippedQty ?? line.qty,
  }));
  receiveMutation.mutate({
   id: transfer.id,
   body: {
    version: transfer.version || 1,
    linesReceived,
   },
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
      <PermissionGate action="receive" resource="operations_transfers">
       {transferStatus === TRANSFER_STATUS.IN_TRANSIT && (
        <Button
         className="w-full md:w-auto px-6 py-2.5 bg-[#0B1220] dark:bg-[#b48e67] text-white dark:text-[#0B1220] font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
         onClick={handleConfirmReceipt}
         disabled={receiveMutation.isPending}
        >
         {receiveMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
         ) : (
          <PackageCheck className="w-4 h-4" />
         )}
         {t('confirm_receipt')}
        </Button>
       )}
      </PermissionGate>
     </div>
    </div>
   </div>

   <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-8 bg-card border border-border shadow-sm/50 p-4 sm:p-8 pb-8 rounded-2xl relative overflow-visible shadow-2xl shrink-0 h-auto min-h-min">

    <div className="flex flex-col gap-1.5 w-full min-w-0">
     <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1">{t('from_warehouse')}</span>
     <div className="flex items-center w-full min-h-[44px] p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-foreground truncate">
      {transfer?.fromWarehouseName}
     </div>
    </div>

    <div className="flex flex-col gap-1.5 w-full min-w-0">
     <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1">{t('to_warehouse')}</span>
     <div className="flex items-center w-full min-h-[44px] p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-foreground truncate">
      {transfer?.toWarehouseName}
     </div>
    </div>

    {transfer?.shippedAt && (
     <div className="flex flex-col gap-1.5 w-full min-w-0">
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1">{t('shipped_at')}</span>
      <div className="flex items-center justify-between gap-2 w-full min-h-[44px] p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-foreground min-w-0">
       <ClientOnlyTime 
        date={transfer.shippedAt} 
        mode="datetime" 
        className="font-mono text-cyan-500/80 truncate"
       />
       <Truck className="w-4 h-4 text-cyan-500/40 shrink-0" />
      </div>
     </div>
    )}

    {transfer?.receivedAt && (
     <div className="flex flex-col gap-1.5 w-full min-w-0">
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1">{t('received_at')}</span>
      <div className="flex items-center justify-between gap-2 w-full min-h-[44px] p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-foreground min-w-0">
       <ClientOnlyTime 
        date={transfer.receivedAt} 
        mode="datetime" 
        className="font-mono text-emerald-500/80 truncate"
       />
       <PackageCheck className="w-4 h-4 text-emerald-500/40 shrink-0" />
      </div>
     </div>
    )}


    <div className="col-span-1 md:col-span-4 flex flex-col gap-1.5 w-full min-w-0">
     <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1">{tCommon('notes')}</span>
     <div className="flex items-start w-full min-h-[60px] p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-foreground whitespace-pre-wrap break-words">
      {transfer?.notes || '—'}
     </div>
    </div>

    {transfer?.varianceReason && (
     <div className="col-span-1 md:col-span-4 flex flex-col gap-1.5 w-full min-w-0">
      <span className="text-[11px] font-bold text-status-warning/80 uppercase tracking-wider pl-1">{t('variance_reason')}</span>
      <div className="flex items-start w-full min-h-[60px] p-3 bg-status-warning/10 border border-status-warning/30 rounded-xl text-sm font-medium text-foreground whitespace-pre-wrap break-words">
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
      <div key={line.id} className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-xl p-3 shadow-sm flex flex-col gap-3">
       {/* Item Identity */}
       <div className="flex flex-col border-b border-gray-100 dark:border-gray-800 pb-2">
        <span className="text-sm font-black text-[#0B1220] dark:text-white">{line.item?.name}</span>
        <span className="text-[10px] text-gray-400 font-mono tracking-widest">{line.item?.code}</span>
       </div>
       
       {/* Qty Grid */}
       <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col bg-gray-50 dark:bg-[#0B1220] p-2 rounded-lg border border-gray-100 dark:border-gray-800 text-center">
         <span className="text-[9px] font-bold text-gray-500 uppercase">{t('transfer_qty')}</span>
         <span className="text-xs font-bold text-[#0B1220] dark:text-gray-200" dir="ltr">{line.qty} {line.item?.primaryUom?.code}</span>
        </div>
        <div className="flex flex-col bg-gray-50 dark:bg-[#0B1220] p-2 rounded-lg border border-gray-100 dark:border-gray-800 text-center">
         <span className="text-[9px] font-bold text-gray-500 uppercase">{t('shipped_qty')}</span>
         <span className="text-xs font-bold text-[#0B1220] dark:text-gray-200" dir="ltr">{line.shippedQty ?? line.qty}</span>
        </div>
        <div className="flex flex-col bg-cyan-50 dark:bg-cyan-900/10 p-2 rounded-lg border border-cyan-100 dark:border-cyan-800/30 text-center">
         <span className="text-[9px] font-bold text-cyan-700 dark:text-cyan-400 uppercase">{t('received_qty')}</span>
         <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400" dir="ltr">{line.receivedQty ?? '—'}</span>
        </div>
       </div>
      </div>
     ))}
    </div>
   </div>
  </div>
 );
}
