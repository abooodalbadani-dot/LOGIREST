"use client";

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { LockBanner } from '@/components/shared/LockBanner';
import { TransferLine } from '@/features/operations/hooks/useTransfer';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Truck, PackageCheck, ArrowLeft } from 'lucide-react';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { TRANSFER_STATUS } from '@logirest/shared-types';
import { type DocumentStatus } from '@logirest/shared-types';
import { useAuth } from '@/providers/AuthProvider';
import { Link } from '@/i18n/navigation';
import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import { FormFooter } from '@/components/layouts/FormLayout';
import { useLocale } from '@/hooks/useLocale';
import type { Transfer } from '@/types/documents';

interface TransferFormProps {
 transfer: Transfer;
 id: string;
 onConflict: (type: string, id: string) => void;
}

export function TransferForm({ transfer, id }: TransferFormProps) {

 const t = useTranslations('operations.transfer');
 const tCommon = useTranslations('common');
 const router = useRouter();
 const { user } = useAuth();
 const { gradientClass, locale } = useLocale();

 // Dual warehouse lock
 const { data: fromLockState } = useWarehouseLock(transfer?.fromWarehouseId ?? '');
 const { data: toLockState } = useWarehouseLock(transfer?.toWarehouseId ?? '');
 const isFromLocked = fromLockState?.isLocked ?? false;
 const isToLocked = toLockState?.isLocked ?? false;
 const isEitherLocked = isFromLocked || isToLocked;

 const transferStatus = (transfer?.transferStatus || TRANSFER_STATUS.DRAFT) as DocumentStatus;
 const isLocked = transferStatus !== TRANSFER_STATUS.DRAFT;
 const isLockedState = isLocked;

 return (
  <div className="flex flex-col flex-1 w-full max-w-full min-w-0 overflow-x-hidden p-4 sm:p-6 md:p-8 pb-32 md:pb-8 mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
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
     className="text-label-xs font-semibold uppercase text-muted-foreground hover:text-foreground transition-colors"
    >
     <ArrowLeft className="w-3 h-3 me-2" />
     {tCommon('back')}
    </Button>
   </div>

   <PageHeader
    title={t('detail_title')}
    subtitle={
     <div className="flex items-center gap-2">
      <span>{tCommon('doc_number')}</span>
      <span dir="ltr" className="font-mono text-cyan-500/80">{transfer?.documentNumber}</span>
     </div>
    }
    children={
     <div className="flex gap-4 items-center">
      <StatusBadge status={transferStatus as BadgeStatus} />
     </div>
    }
   />

   <form 
    onSubmit={(e) => e.preventDefault()} 
    className="space-y-8"
   >
    <DocumentLockBanner 
     status={transferStatus} 
     isLocked={isLockedState} 
    />

    <DocumentLockWrapper isLocked={isLockedState}>
     <div className="col-span-1 md:col-span-12 space-y-8">
      <div className="space-y-2">
       {isFromLocked && <LockBanner lockState={fromLockState} />}
       {isToLocked && toLockState?.sessionId !== fromLockState?.sessionId && (
        <LockBanner lockState={toLockState} />
       )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 bg-card border-y border-x-0 sm:border border-border shadow-sm px-4 py-5 sm:p-6 rounded-none sm:rounded-2xl relative overflow-hidden">
       <div className={`absolute top-0 inset-x-0 h-1 ${gradientClass} from-cyan-500/50 via-cyan-500/20 to-transparent`} />

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
        <DocumentReadOnlyOverlay isPosted={transferStatus === 'POSTED' || transferStatus === 'CANCELLED'}>
         {/* Desktop View */}
         <div className="hidden md:block overflow-x-auto border border-border/50 rounded-lg custom-scrollbar">
          <DocumentLineItemTable<TransferLine>
           lines={(transfer?.lines ?? []) as unknown as TransferLine[]}
           isReadOnly={isLocked}
           onRemoveLine={() => {}}
           hideLotColumns={true}
           dense={true}
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
           ]}
          />
         </div>

         {/* Mobile View (Matches Transfer Details style) */}
         <div className="flex flex-col gap-3 md:hidden mt-4">
          {(transfer?.lines ?? []).map((line) => (
           <div key={line.id} className="bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-xl p-3 shadow-sm flex flex-col gap-3">
             {/* Item Identity */}
             <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-2">
              {line.item?.image ? (
               <img src={line.item.image} alt="Product" className="w-9 h-9 object-cover rounded-md border border-gray-200 dark:border-gray-800 shrink-0 shadow-sm" />
              ) : (
               <div className="w-9 h-9 bg-gray-50 dark:bg-surface-container flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-800 text-[9px] text-muted-foreground font-mono shrink-0 shadow-sm">
                N/A
               </div>
              )}
              <div className="flex flex-col flex-1 min-w-0 text-start">
               <span className="text-sm font-black text-[#0B1220] dark:text-white truncate">
                {locale === 'ar' ? (line.item?.nameAr || line.item?.name) : (line.item?.nameEn || line.item?.name)}
               </span>
               <div className="flex items-center gap-1.5 mt-0.5">
                 <div className="bg-gray-100 dark:bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-200/50 dark:border-gray-700/50 text-[10px] text-gray-500 dark:text-gray-400 font-mono tracking-widest inline-block" dir="ltr">{line.item?.code}</div>
               </div>
              </div>
             </div>
            
            {/* Qty Grid */}
            <div className="grid grid-cols-3 gap-2">
             <div className="flex flex-col bg-gray-50 dark:bg-card p-2 rounded-lg border border-gray-100 dark:border-gray-800 text-center">
              <span className="text-[9px] font-bold text-gray-500 uppercase">{t('transfer_qty')}</span>
              <span className="text-xs font-bold text-[#0B1220] dark:text-gray-200 mt-1" dir="ltr">
               {line.qty} {locale === 'ar' ? (line.item?.primaryUom?.nameAr || line.item?.primaryUom?.name || 'حبة') : (line.item?.primaryUom?.code || 'PCS')}
              </span>
             </div>
             <div className="flex flex-col bg-gray-50 dark:bg-card p-2 rounded-lg border border-gray-100 dark:border-gray-800 text-center">
              <span className="text-[9px] font-bold text-gray-500 uppercase">{t('shipped_qty')}</span>
              <span className="text-xs font-bold text-[#0B1220] dark:text-gray-200 mt-1" dir="ltr">
               {line.shippedQty ?? line.qty}
              </span>
             </div>
             <div className="flex flex-col bg-cyan-50 dark:bg-cyan-900/10 p-2 rounded-lg border border-cyan-100 dark:border-cyan-800/30 text-center">
              <span className="text-[9px] font-bold text-cyan-700 dark:text-cyan-400 uppercase">{t('received_qty')}</span>
              <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 mt-1" dir="ltr">
               {line.receivedQty ?? '—'}
              </span>
             </div>
            </div>
           </div>
          ))}
         </div>
        </DocumentReadOnlyOverlay>
      </div>
     </div>
    </DocumentLockWrapper>

    <div className="flex flex-col-reverse md:flex-row justify-end items-center gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 w-full">
     <Button
      type="button"
      onClick={() => router.push('/transfers')}
      className="w-full md:w-auto px-6 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
     >
      {tCommon('cancel') || 'Cancel'}
     </Button>

     <div className="flex items-center gap-2 w-full md:w-auto flex-col md:flex-row">
      {transferStatus === TRANSFER_STATUS.DRAFT && (
       <PermissionGate action="ship" resource="operations_transfers">
        <ActionGuard documentType="TRANSFER" status={transferStatus} action="SHIP" role={user?.role}>
         <Link href={`/transfers/${id}/ship`} className="w-full md:w-auto block">
          <Button
           className="w-full md:w-auto px-6 py-2.5 bg-[#0B1220] dark:bg-[#b48e67] text-white dark:text-[#0B1220] font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
          >
           <Truck className="w-5 h-5" />
           {t('ship')}
          </Button>
         </Link>
        </ActionGuard>
       </PermissionGate>
      )}

      {transferStatus === TRANSFER_STATUS.IN_TRANSIT && (
       <PermissionGate action="receive" resource="operations_transfers">
        <ActionGuard documentType="TRANSFER" status={transferStatus} action="RECEIVE" role={user?.role}>
         <Link href={`/transfers/${id}/receive`} className="w-full md:w-auto block">
          <Button
           className="w-full md:w-auto px-6 py-2.5 bg-[#0B1220] dark:bg-[#b48e67] text-white dark:text-[#0B1220] font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
          >
           <PackageCheck className="w-5 h-5" />
           {t('confirm_receipt')}
          </Button>
         </Link>
        </ActionGuard>
       </PermissionGate>
      )}
     </div>
    </div>

   </form>
  </div>
 );
}
