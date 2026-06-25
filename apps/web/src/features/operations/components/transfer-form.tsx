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
 const { gradientClass } = useLocale();

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 bg-card border border-border shadow-sm/50 p-8 rounded-2xl relative overflow-hidden shadow-2xl">
       <div className={`absolute top-0 inset-x-0 h-1 ${gradientClass} from-cyan-500/50 via-cyan-500/20 to-transparent`} />

       <div className="space-y-2">
        <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{t('from_warehouse')}</label>
        <div className="bg-surface-container-highest/40 rounded-xl p-4 font-bold text-body-md">
         {transfer?.fromWarehouseName}
        </div>
       </div>

       <div className="space-y-2">
        <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{t('to_warehouse')}</label>
        <div className="bg-surface-container-highest/40 rounded-xl p-4 font-bold text-body-md">
         {transfer?.toWarehouseName}
        </div>
       </div>

       {transfer?.shippedAt && (
        <div className="space-y-2">
         <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{t('shipped_at')}</label>
         <div className="bg-surface-container-highest/30 rounded-xl p-4 flex items-center justify-between">
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
         <div className="bg-surface-container-highest/30 rounded-xl p-4 flex items-center justify-between">
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
        <div className="bg-surface-container-highest/40 rounded-xl p-4 font-medium text-body-md min-h-[60px]">
         {transfer?.notes || '—'}
        </div>
       </div>

       {transfer?.varianceReason && (
        <div className="col-span-1 md:col-span-4 space-y-2">
         <label className="text-label-xs font-semibold uppercase text-status-warning/80 ms-1">{t('variance_reason')}</label>
         <div className="bg-status-warning/5 border-none rounded-xl p-4 font-medium text-body-md">
          {transfer.varianceReason}
         </div>
        </div>
       )}
      </div>

      <div className="w-full max-w-full min-w-0 overflow-x-auto border border-border/50 rounded-lg custom-scrollbar">
        <DocumentReadOnlyOverlay isPosted={transferStatus === 'POSTED' || transferStatus === 'CANCELLED'}>
         <DocumentLineItemTable<TransferLine>
          lines={(transfer?.lines ?? []) as unknown as TransferLine[]}
          isReadOnly={true}
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
          ]}
         />
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
