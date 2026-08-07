'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { DocumentLineItemTable, getLineUomDisplay } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
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
import { AlertCircle, Truck, ArrowLeft, RefreshCw } from 'lucide-react';
import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import { FormFooter } from '@/components/layouts/FormLayout';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { toast } from 'sonner';
import { audioAlerts } from '@/utils/audio';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useAbortController } from '@/hooks/useAbortController';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

import { resolveBarcodeAndUom } from '@/utils/barcode-resolver';

export function formatScannedQuantity(qty: number): number {
 if (Math.abs(qty - Math.round(qty)) < 0.001) {
  return Math.round(qty);
 }
 return parseFloat(qty.toFixed(4));
}

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
 const [statusMessage, setStatusMessage] = useState<string>('');
 const lastResetId = useRef<string | null>(null);
 const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());

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

 const handleScan = useCallback(async (barcode: string) => {
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

  const clean = barcode.trim();
  if (!clean) return;

  const resolved = await resolveBarcodeAndUom(clean, transfer?.lines.map(l => l.item));
  if (!resolved) {
   setScanStatus('error');
   const msg = t('scan_error') || "Item or barcode not found.";
   setStatusMessage(msg);
   toast.error(msg);
   setTimeout(() => setScanStatus('idle'), 2000);
   throw new Error('ItemNotFound');
  }

  const { item: scannedItem, uomId: scannedUomId } = resolved;

  // Find candidate lines by item identity
  const candidateLines = transfer?.lines.filter(l => 
   l.itemId === scannedItem.id || 
   l.item?.code?.toLowerCase() === scannedItem.code?.toLowerCase() ||
   l.item?.id === scannedItem.id
  ) || [];

  if (candidateLines.length === 0) {
   setScanStatus('error');
   const msg = t('scan_error') || "Scanned item is not part of this manifest.";
   setStatusMessage(msg);
   toast.error(msg);
   setTimeout(() => setScanStatus('idle'), 2000);
   throw new Error('ItemNotInManifest');
  }

  // 1. Try exact UOM match
  let matchingLine = candidateLines.find(l => l.uomId === scannedUomId);
  let incrementQty = 1;

  // 2. If no direct match, check UOM conversions between scanned UOM and line UOM
  if (!matchingLine && candidateLines.length === 1) {
   const line = candidateLines[0];
   const conversions = (line.item?.uomConversions || []) as Array<{ fromUomId: string; toUomId: string; factor: number }>;
   const conv = conversions.find(c =>
    (c.fromUomId === scannedUomId && c.toUomId === line.uomId) ||
    (c.toUomId === scannedUomId && c.fromUomId === line.uomId)
   );

   if (conv && conv.factor > 0) {
    matchingLine = line;
    incrementQty = conv.fromUomId === scannedUomId ? Number(conv.factor) : Number(1 / conv.factor);
   }
  }

  // 3. Strict Rejection if UOMs do not match and no valid conversion exists
  if (!matchingLine) {
   setScanStatus('error');
   const msg = locale === 'ar'
    ? "وحدة القياس للباركود الممسوح لا تطابق وحدة القياس المتوقعة لهذا السطر"
    : "Scanned barcode UOM does not match the expected UOM for this line.";
   setStatusMessage(msg);
   toast.error(msg);
   setTimeout(() => setScanStatus('idle'), 2000);
   throw new Error('UomMismatch');
  }

  const currentScanned = scannedLines[matchingLine.id] ?? 0;
  const rawNext = currentScanned + incrementQty;
  const formattedNext = formatScannedQuantity(rawNext);

  if (formattedNext > (matchingLine.qty + 0.0001)) {
   setScanStatus('error');
   const msg = t('scan_duplicate_warning') || "Item already fully verified.";
   setStatusMessage(msg);
   toast.warning(msg);
   setTimeout(() => setScanStatus('idle'), 2000);
   throw new Error('ScanDuplicate');
  }

  setScannedLines(prev => ({
   ...prev,
   [matchingLine.id]: (prev[matchingLine.id] ?? 0) + incrementQty
  }));
  setScanStatus('success');
  setStatusMessage(`${t('scan_success')}: ${matchingLine.item?.name}`);
  setTimeout(() => {
   setScanStatus('idle');
   setStatusMessage('');
  }, 2500);
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

 const allScanned = transfer.lines.every(l => {
  const scanned = formatScannedQuantity(scannedLines[l.id] ?? 0);
  return scanned >= (l.qty - 0.0001);
 });

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
        
         {/* Desktop View */}
         <div className="hidden md:block">
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
           renderQty={(line) => (
            <div className="flex justify-center">
             <div className="px-3 py-1 font-mono font-bold text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-card rounded-lg">
              {line.qty}
             </div>
            </div>
           )}
           extraColumns={[
            {
             header: tCommon('status'),
             cell: (line: TransferLine) => {
              const scannedRaw = scannedLines[line.id] ?? 0;
              const scannedDisplay = formatScannedQuantity(scannedRaw);
              const isFullyScanned = scannedRaw >= (line.qty - 0.0001);
              return (
               <div className="flex justify-center">
                <div className={cn(
                 "px-3 py-1 rounded-lg text-label-xs font-semibold uppercase flex items-center gap-2",
                 isFullyScanned 
                 ? "bg-muted/50 text-foreground border border-emerald-500/20" 
                 : scannedRaw > 0 
                 ? "bg-muted/50 text-foreground border border-cyan-500/20"
                 : "border border-gray-300 dark:border-gray-600 bg-white dark:bg-card"
                )}>
                 {isFullyScanned ? `✓ ${t('verified_label')}` : `${scannedDisplay}/${line.qty}`}
                </div>
               </div>
              );
             }
            }
           ]}
          />
         </div>

         {/* Mobile View (Matches Transfer Details style) */}
         <div className="flex flex-col gap-3 md:hidden p-4">
          {transfer.lines.map((line) => {
           const scannedRaw = scannedLines[line.id] ?? 0;
           const scannedDisplay = formatScannedQuantity(scannedRaw);
           const isFullyScanned = scannedRaw >= (line.qty - 0.0001);
           const itemImage = (line.item as unknown as { image?: string | null }).image;
           return (
            <div key={line.id} className="bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 shadow-sm flex flex-col gap-3">
             {/* Item Identity */}
             <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-2">
              {itemImage ? (
               <img src={itemImage} alt="Product" className="w-9 h-9 object-cover rounded-md border border-gray-200 dark:border-gray-800 shrink-0 shadow-sm" />
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

             {/* Qty & Status Grid */}
             <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col bg-gray-50 dark:bg-card p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 text-center">
               <span className="text-[9px] font-bold text-gray-500 uppercase">{t('transfer_qty')}</span>
               <span className="text-xs font-bold text-[#0B1220] dark:text-gray-200 mt-1" dir="ltr">
                {line.qty} {getLineUomDisplay(line)}
               </span>
              </div>
              <div className={cn(
               "flex flex-col p-2.5 rounded-lg border text-center transition-colors",
               isFullyScanned 
               ? "bg-emerald-50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-800/30" 
               : scannedRaw > 0 
               ? "bg-cyan-50 dark:bg-cyan-950/10 border-cyan-100 dark:border-cyan-800/30" 
               : "bg-gray-50 dark:bg-card border-gray-100 dark:border-gray-800"
              )}>
               <span className={cn(
                "text-[9px] font-bold uppercase",
                isFullyScanned ? "text-emerald-700 dark:text-emerald-400" : scannedRaw > 0 ? "text-cyan-700 dark:text-cyan-400" : "text-gray-500"
               )}>
                {tCommon('status')}
               </span>
               <span className={cn(
                "text-xs font-bold mt-1",
                isFullyScanned ? "text-emerald-700 dark:text-emerald-400" : scannedRaw > 0 ? "text-cyan-700 dark:text-cyan-400" : "text-[#0B1220] dark:text-gray-200"
               )} dir="ltr">
                {isFullyScanned ? `✓ ${t('verified_label')}` : `${scannedDisplay}/${line.qty}`}
               </span>
              </div>
             </div>
            </div>
           );
          })}
         </div> 
       </div>
      </div>
     </div>

     {!allScanned && (
      <div className="flex items-start gap-2.5 text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-xs font-semibold leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300">
       <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
       <span>{t('scanning_required_hint')}</span>
      </div>
     )}

    {/* Desktop Action Bar (hidden md:flex) */}
    <div className="hidden md:flex justify-end items-center gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 w-full">
     <Button
      type="button"
      variant="outline"
      onClick={() => router.push(`/transfers/${id}`, { skipGuard: true })}
      className="px-6 py-2.5 border border-border text-foreground font-bold rounded-lg hover:bg-surface-container-high transition-colors"
     >
      {tCommon('cancel') || 'Cancel'}
     </Button>
     <PermissionGate action="ship" resource="transfer">
      <Button
       type="button"
       disabled={isMutationBlocked || shipTransfer.isPending || !allScanned || isWorkflowLocked}
       onClick={() => setConfirmDialogOpen(true)}
       className="px-6 py-2.5 bg-brand-gold hover:bg-brand-gold/90 text-slate-950 font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
       <Truck className="w-5 h-5" />
       {t('confirm_shipment')}
      </Button>
     </PermissionGate>
    </div>

    {/* Mobile Action Bar (flex flex-col gap-3 md:hidden) */}
    <div className="flex flex-col gap-3 md:hidden mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 w-full">
     {/* Row 1: Primary Action (Top) */}
     <PermissionGate action="ship" resource="transfer">
      <Button
       type="button"
       disabled={isMutationBlocked || shipTransfer.isPending || !allScanned || isWorkflowLocked}
       onClick={() => setConfirmDialogOpen(true)}
       className="w-full py-3 bg-brand-gold hover:bg-brand-gold/90 text-slate-950 font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
       <Truck className="w-5 h-5" />
       {t('confirm_shipment')}
      </Button>
     </PermissionGate>

     {/* Row 2: Secondary Action (Bottom) */}
     <Button
      type="button"
      variant="outline"
      onClick={() => router.push(`/transfers/${id}`, { skipGuard: true })}
      className="w-full py-3 border border-border text-foreground font-bold rounded-lg hover:bg-surface-container-high transition-colors"
     >
      {tCommon('cancel') || 'Cancel'}
     </Button>
    </div>

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
