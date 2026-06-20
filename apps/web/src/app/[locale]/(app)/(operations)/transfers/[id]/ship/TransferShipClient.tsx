'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { LockBanner } from '@/components/shared/LockBanner';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { useTransfer, TransferLine } from '@/features/operations/hooks/useTransfer';
import { useShipTransfer } from '@/features/operations/hooks/useShipTransfer';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { cn } from '@/lib/utils';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { isDocumentLocked, canPerformActionV2, type DocumentStatus } from '@logirest/shared-types';
import { useAuth } from '@/providers/AuthProvider';
import { AlertCircle, Truck, ArrowLeft, Printer, RefreshCw } from 'lucide-react';
import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import { FormFooter } from '@/components/layouts/FormLayout';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { toast } from 'sonner';
import { audioAlerts } from '@/utils/audio';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useAbortController } from '@/hooks/useAbortController';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

export function TransferShipClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
 const t = useTranslations('operations.transfer');
 const tCommon = useTranslations('common');
 const { data: transfer, isLoading, error } = useTransfer(id);
 const { user } = useAuth();
 const { open, handleReload, handleClose, triggerConflict } = useConflictHandler('transfer', id);
 const shipTransfer = useShipTransfer({ onConflict: triggerConflict });
 const abortController = useAbortController();
 const { playSound } = useAudioFeedback();

 const [scannedLines, setScannedLines] = useState<Record<string, number>>({});
 const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
 const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
 const [statusMessage, setStatusMessage] = useState('');

 const lastResetId = useRef<string | null>(null);
 const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

 useEffect(() => {
  if (transfer && transfer.id !== lastResetId.current) {
   lastResetId.current = transfer.id;
   setIdempotencyKey(crypto.randomUUID());
  }
 }, [transfer]);

 const isDirty = Object.keys(scannedLines).length > 0;
 const { router } = useUnsavedChangesGuard(isDirty);

 const { data: fromLockState, isError: isLockError, refetch: refetchLock } = useWarehouseLock(transfer?.fromWarehouseId ?? '');
 const isWarehouseLocked = !!fromLockState?.isLocked;
 const isWorkflowLocked = isDocumentLocked('TRANSFER', transfer?.transferStatus as DocumentStatus);
 const isMutationBlocked = isWarehouseLocked || isWorkflowLocked || isLockError;

 useEffect(() => {
  if (isLockError) {
   const handle = setTimeout(() => {
    setConfirmDialogOpen(false);
   }, 0);
   return () => clearTimeout(handle);
  }
 }, [isLockError]);

 const handleScan = useCallback((barcode: string) => {
  if (isMutationBlocked) {
   setScanStatus('error');
   
   let msg = "";
   if (isLockError) {
    msg = t('warehouse_lock_check_failed_desc') || "Could not verify warehouse lock status. Actions are locked for safety.";
   } else if (isWarehouseLocked) {
    msg = t('warehouse_locked_mutation_blocked') || "Warehouse is locked. Scan mutation blocked.";
   } else {
    msg = t('document_locked_mutation_blocked') || "Document is locked. Scan mutation blocked.";
   }

   setStatusMessage(msg);
   toast.error(msg);
   setTimeout(() => setScanStatus('idle'), 2000);
   throw new Error('WarehouseLocked');
  }

  const line = transfer?.lines.find(l => 
    l.item?.code === barcode || 
    l.item?.barcodes?.some(b => b.barcode === barcode)
  );
  if (line) {
   const currentScanned = scannedLines[line.id] ?? 0;
   if (currentScanned >= line.qty) {
    setScanStatus('error');
    const msg = t('scan_duplicate_warning') || "Item already fully verified.";
    setStatusMessage(msg);
    toast.warning(msg);
    setTimeout(() => setScanStatus('idle'), 2000);
    throw new Error('ScanDuplicate');
   }

   setScannedLines(prev => ({
    ...prev,
    [line.id]: (prev[line.id] ?? 0) + 1
   }));
   setScanStatus('success');
   setStatusMessage(`${t('scan_success')}: ${line.item?.name}`);
   setTimeout(() => setScanStatus('idle'), 2000);
  } else {
   setScanStatus('error');
   setStatusMessage(t('scan_error'));
   toast.error(t('scan_error'));
   setTimeout(() => setScanStatus('idle'), 2000);
   throw new Error('ItemNotFound');
  }
 }, [transfer, scannedLines, isMutationBlocked, isWarehouseLocked, isLockError, t, locale]);

 const handleShip = () => {
  if (!transfer) return;

  const scanLines = Object.entries(scannedLines).map(([line_id, scanned_qty]) => ({ line_id, scanned_qty }));
  shipTransfer.mutate(
   { 
    id, 
    version: transfer.version || 1,
    signal: abortController.signal,
    headers: {
     'X-Idempotency-Key': idempotencyKey
    },
    lines: scanLines
   },
   {
    onSuccess: () => {
     playSound('success');
     router.push(`/transfers/${id}`, { skipGuard: true });
    },
   }
  );
 };

 if (isLoading) {
  return <PageSkeleton />;
 }

 if (error || !transfer) {
  return <ErrorState onRetry={() => window.location.reload()} />;
 }

 if (!canPerformActionV2('TRANSFER', transfer?.transferStatus as DocumentStatus, 'SHIP', user?.role)) {
  return (
   <div className="space-y-4 min-w-0 items-center flex-1 gap-6 justify-center flex-col flex min-h-[60vh] w-full">
    <AlertCircle className="w-12 h-12 text-status-error" />
    <p className="font-bold text-title-sm">{t('invalid_status_for_ship')}</p>
    <Button onClick={() => router.push(`/transfers/${id}`)} variant="outline">
     {tCommon('back')}
    </Button>
   </div>
  );
 }

 const allScanned = transfer.lines.every(l => (scannedLines[l.id] ?? 0) >= l.qty);

 return (
  <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
   <div className="flex items-center justify-between">
    <Breadcrumb 
     items={[
      { label: t('title'), href: `/transfers` },
      { label: transfer.documentNumber, href: `/transfers/${id}` },
      { label: t('ship') }
     ]} 
    />
    <Button
     variant="ghost"
     onClick={() => router.back()}
     className="text-label-xs font-semibold uppercase text-muted-foreground hover:text-foreground"
    >
     <ArrowLeft className="w-3 h-3 me-2" />
     {tCommon('back')}
    </Button>
   </div>

   <PageHeader
    title={t('ship_transfer')}
    subtitle={t('ship_confirm_desc')}
    children={
     <PermissionGate action="post" resource="transfer">
      <Button
       variant="outline"
       className="bg-surface-container-high border-white/5 rounded-xl h-11 px-6 text-label-xs font-semibold uppercase transition-all hover:bg-surface-container-highest"
       onClick={() => window.print()}
      >
       <Printer className="w-4 h-4 me-2" />
       {tCommon('print')}
      </Button>
     </PermissionGate>
    }
   />

   <form 
    onSubmit={(e) => e.preventDefault()} 
    className="space-y-8"
   >
    <DocumentLockBanner 
     status={transfer.transferStatus as DocumentStatus} 
     isLocked={isWorkflowLocked} 
    />

     <div className="space-y-4">
      {fromLockState?.isLocked && <LockBanner lockState={fromLockState} />}
      {isLockError && (
       <div className="bg-status-error/10 border border-status-error/30 rounded-2xl p-5 flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-200 backdrop-blur-md">
        <div className="flex items-center gap-4">
         <div className="flex shrink-0 items-center justify-center h-12 w-12 rounded-xl bg-status-error/20 text-status-error">
          <AlertCircle className="h-6 w-6" />
         </div>
         <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold text-status-error uppercase text-label-xs">
           {t('warehouse_lock_check_failed') || "Lock Check Failed"}
          </span>
          <span className="text-status-error/80 text-label-sm font-medium leading-relaxed">
           {t('warehouse_lock_check_failed_desc') || "Could not verify warehouse lock status. Actions are locked for safety."}
          </span>
         </div>
        </div>
        <Button
         type="button"
         variant="outline"
         size="sm"
         onClick={() => refetchLock()}
         className="bg-status-error/20 hover:bg-status-error/30 border-status-error/30 text-status-error hover:text-status-error rounded-xl gap-2 font-semibold text-label-xs uppercase transition-all shrink-0"
        >
         <RefreshCw className="h-4 w-4" />
         {tCommon('retry') || "Retry"}
        </Button>
       </div>
      )}
     </div>

     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
       <div className="bg-card border border-border shadow-sm/50 rounded-3xl border border-white/5 p-8 space-y-8 relative overflow-hidden h-full">
        <div className={`absolute top-0 inset-x-0 h-1 ${locale === 'ar' ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-cyan-500/50 to-transparent`} />
        
        <div className="space-y-6">
         <div className="space-y-1">
          <span className="text-label-xs font-semibold uppercase text-muted-foreground/50">{t('from_warehouse')}</span>
          <p className="text-title-lg font-semibold">{transfer.fromWarehouseName}</p>
         </div>

         <div className="space-y-1">
          <span className="text-label-xs font-semibold uppercase text-muted-foreground/50">{t('to_warehouse')}</span>
          <p className="text-title-lg font-semibold">{transfer.toWarehouseName}</p>
         </div>

         <div className="pt-6 border-t border-white/5">
          <ScanInput
           onScan={handleScan}
           placeholder={t('scan_placeholder_ship')}
           scanStatus={scanStatus}
           statusMessage={statusMessage}
           scannerMode={true}
           size="lg"
           className="w-full"
          />
         </div>
        </div>
       </div>
      </div>

      <div className="lg:col-span-2">
       <div className="bg-card border border-border shadow-sm/30 rounded-3xl border border-white/5 overflow-hidden shadow-2xl h-full">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-card border border-border shadow-sm">
         <h3 className="text-label-xs font-semibold uppercase text-foreground">{t('manifest_items')}</h3>
         <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full border border-cyan-500/20">
          <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", allScanned ? "bg-emerald-500" : "bg-cyan-500")} />
          <span className={cn("text-label-xxs font-semibold uppercase tracking-normal", allScanned ? "text-foreground" : "text-foreground")}>
           {allScanned ? tCommon('statuses.completed') : t('verification_in_progress')}
          </span>
         </div>
        </div>
        
        <DocumentLineItemTable
         lines={transfer.lines}
         locale={locale}
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
         extraColumns={[
          {
           header: tCommon('status'),
           cell: (line: TransferLine) => {
            const scanned = scannedLines[line.id] ?? 0;
            const isFullyScanned = scanned >= line.qty;
            return (
             <div className="flex justify-center">
              <div className={cn(
               "px-3 py-1 rounded-lg text-label-xs font-semibold uppercase flex items-center gap-2",
               isFullyScanned 
               ? "bg-muted/50 text-foreground border border-emerald-500/20" 
               : scanned > 0 
               ? "bg-muted/50 text-foreground border border-cyan-500/20"
               : "bg-surface-container-highest text-muted-foreground/40 border border-white/5"
              )}>
               {isFullyScanned ? `✓ ${t('verified_label')}` : `${scanned}/${line.qty}`}
              </div>
             </div>
            );
           }
          }
         ]}
        />
       </div>
      </div>
     </div>

    <FormFooter 
     onCancel={() => router.push(`/transfers/${id}`, { skipGuard: true })}
     onSubmit={handleShip}
     isSaving={shipTransfer.isPending}
     isLocked={isWorkflowLocked}
     isDirty={isDirty}
     isValid={allScanned}
     actions={
      <PermissionGate action="post" resource="transfer">
       <Button
        disabled={isMutationBlocked || shipTransfer.isPending || !allScanned}
        onClick={() => setConfirmDialogOpen(true)}
        className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl h-14 px-12 text-label-xs font-black uppercase tracking-widest transition-all shadow-2xl shadow-cyan-600/30 border-none"
       >
        <Truck className="w-5 h-5 me-3" />
        {t('confirm_shipment')}
       </Button>
      </PermissionGate>
     }
    />

    <PostConfirmDialog
     open={confirmDialogOpen}
     onOpenChange={setConfirmDialogOpen}
     title={t('ship_confirm_title')}
     description={t('ship_confirm_desc')}
     warningText={t('ship_confirm_warning')}
     requiresTextConfirmation={false}
     onConfirm={handleShip}
     isLoading={shipTransfer.isPending}
    />

    <ConflictDialog 
     open={open}
     onReload={handleReload}
     onClose={handleClose}
    />
   </form>
  </div>
 );
}
