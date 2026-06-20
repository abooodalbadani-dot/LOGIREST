'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import { LockBanner } from '@/components/shared/LockBanner';
import { FormFooter } from '@/components/layouts/FormLayout';
import { useTransfer, TransferLine } from '@/features/operations/hooks/useTransfer';
import { useReceiveTransfer } from '@/features/operations/hooks/useReceiveTransfer';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PackageCheck, ArrowLeft, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { isDocumentLocked, canPerformActionV2, type DocumentStatus } from '@logirest/shared-types';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { audioAlerts } from '@/utils/audio';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useAbortController } from '@/hooks/useAbortController';
import { formatDate } from '@/utils/currency';

import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

export function TransferReceiveClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
 const t = useTranslations('operations.transfer');
 const tCommon = useTranslations('common');

 const { data: transfer, isLoading, error } = useTransfer(id);
 const { user } = useAuth();
 const { open, handleReload, handleClose, triggerConflict } = useConflictHandler('transfer', id);
 const receiveTransfer = useReceiveTransfer({ onConflict: triggerConflict });
 const abortController = useAbortController();
 const { playSound } = useAudioFeedback();

 const [lines, setLines] = useState<(TransferLine & { _receivedQty?: number; _lotReceives?: Record<string, number> })[]>([]);
 const [varianceReason, setVarianceReason] = useState('');
 const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
 const [lotModalLine, setLotModalLine] = useState<TransferLine & { _receivedQty?: number; _lotReceives?: Record<string, number> } | null>(null);
 const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
 const [statusMessage, setStatusMessage] = useState('');

 const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

 const { data: toLockState, isError: isLockError, refetch: refetchLock } = useWarehouseLock(transfer?.toWarehouseId ?? '');
 const isWarehouseLocked = !!toLockState?.isLocked;
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

 const [prevTransferId, setPrevTransferId] = useState<string | null>(null);
 
 useEffect(() => {
  if (transfer && transfer.id !== prevTransferId) {
   setPrevTransferId(transfer.id);
   setLines(transfer.lines.map(l => {
    const lotReceives: Record<string, number> = {};
    if (l.lotAllocations && l.lotAllocations.length > 0) {
     l.lotAllocations.forEach(la => {
      lotReceives[la.lotId] = la.allocatedQty;
     });
    }
    return {
     ...l,
     _receivedQty: l.shippedQty ?? l.qty,
     _lotReceives: Object.keys(lotReceives).length > 0 ? lotReceives : undefined,
    };
   }));
   setIdempotencyKey(crypto.randomUUID());
  }
 }, [transfer?.id]);

 const hasVariance = lines.some(l => (l._receivedQty ?? 0) !== (l.shippedQty ?? l.qty));
 const isVarianceValid = !hasVariance || varianceReason.trim().length >= 15;

 const isDirty = useMemo(() => {
  if (!transfer) return false;
  const initialReason = '';
  const reasonChanged = varianceReason !== initialReason;
  
  const linesChanged = lines.some((l) => {
   const originalLine = transfer.lines.find(ol => ol.id === l.id);
   if (!originalLine) return false;
   const initialQty = originalLine.shippedQty ?? originalLine.qty;
   return l._receivedQty !== initialQty;
  });
  
  return reasonChanged || linesChanged;
 }, [varianceReason, lines, transfer]);

 const { router, registerDirty } = useUnsavedChangesGuard(isDirty);

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

   const lineIndex = lines.findIndex(l => 
     l.item?.code === barcode || 
     l.item?.barcodes?.some(b => b.barcode === barcode)
   );
   if (lineIndex !== -1) {
    const line = lines[lineIndex];
    const shippedQty = line.shippedQty ?? line.qty;
    const currentReceived = line._receivedQty ?? 0;

    if (currentReceived >= shippedQty) {
     setScanStatus('error');
     const msg = t('scan_duplicate_warning') || "Item already fully verified.";
     setStatusMessage(msg);
     toast.warning(msg);
     setTimeout(() => setScanStatus('idle'), 2000);
     throw new Error('ScanDuplicate');
    }

    setLines(prev => prev.map((l, i) => 
     i === lineIndex ? { ...l, _receivedQty: (l._receivedQty ?? 0) + 1 } : l
    ));
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
  }, [lines, isMutationBlocked, isWarehouseLocked, isLockError, t, locale]);

 const handleReceiveAll = () => {
  if (isMutationBlocked) return;
  setLines(prev => prev.map(l => ({ ...l, _receivedQty: l.shippedQty ?? l.qty })));
  toast.success(t('receive_all_success') || 'All lines marked as received.');
 };

 const handleReceive = () => {
  if (!transfer) return;
  if (isMutationBlocked) {
   audioAlerts.playScanBlocked();
   toast.error(isWarehouseLocked ? t('warehouse_locked_mutation_blocked') : t('document_locked_mutation_blocked'));
   return;
  }

  const linesReceived = lines.map(l => {
   const hasLots = l.lotAllocations && l.lotAllocations.length > 0;
   const lineQty = hasLots && l._lotReceives
    ? Object.values(l._lotReceives).reduce((sum, q) => sum + q, 0)
    : (l._receivedQty ?? l.qty);
   const hasDiscrepancy = lineQty !== (l.shippedQty ?? l.qty);
   return {
    lineId: l.id,
    quantityReceived: lineQty,
    varianceReason: hasDiscrepancy ? varianceReason : undefined
   };
  });
  
  receiveTransfer.mutate({
   id,
   body: {
    version: transfer.version ?? 0,
    linesReceived,
   },
   signal: abortController.signal,
   headers: {
    'X-Idempotency-Key': idempotencyKey
   }
  }, {
   onSuccess: () => {
    playSound('success');
    router.push(`/transfers/${id}`, { skipGuard: true });
   }
  });
 };

 if (isLoading) return <PageSkeleton />;
 if (error || !transfer) return <ErrorState onRetry={() => window.location.reload()} />;

 if (!canPerformActionV2('TRANSFER', transfer?.transferStatus as DocumentStatus, 'RECEIVE', user?.role)) {
  return (
   <div className="space-y-4 min-w-0 items-center flex-1 gap-6 justify-center flex-col flex min-h-[60vh] w-full">
    <AlertCircle className="w-12 h-12 text-status-error" />
    <p className="font-bold text-title-sm">{t('invalid_status_for_receive')}</p>
    <Button onClick={() => router.push(`/transfers/${id}`)} variant="outline">
     {tCommon('back')}
    </Button>
   </div>
  );
 }

 return (
  <form 
   onSubmit={(e) => {
    e.preventDefault();
    setConfirmDialogOpen(true);
   }}
   className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32"
  >
   <div className="flex items-center justify-between">
    <Breadcrumb 
     items={[
      { label: t('title'), href: `/transfers` },
      { label: transfer.documentNumber, href: `/transfers/${id}` },
      { label: t('receive') }
     ]} 
    />
    <Button
     type="button"
     variant="ghost"
     onClick={() => router.back()}
     className="text-label-xs font-semibold uppercase text-muted-foreground hover:text-foreground"
    >
     <ArrowLeft className="w-3 h-3 me-2" />
     {tCommon('back')}
    </Button>
   </div>

   <PageHeader
    title={t('confirm_receipt')}
    subtitle={t('receive_confirm_desc')}
   />

   <div className="space-y-4">
    <DocumentLockBanner 
     isLocked={isWorkflowLocked}
     status={transfer.transferStatus as DocumentStatus}
    />
    
    {toLockState?.isLocked && <LockBanner lockState={toLockState} />}

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
    
    {hasVariance && (
     <div className="bg-status-warning/10 border border-status-warning/30 rounded-2xl p-4 flex items-start gap-4 animate-in slide-in-from-top-2 duration-500">
      <Info className="w-5 h-5 text-status-warning mt-0.5" />
      <div className="space-y-1">
       <p className="text-label-sm font-semibold text-status-warning uppercase">{t('variance_detected')}</p>
       <p className="text-body-md text-status-warning/80 font-medium">{t('variance_instruction')}</p>
      </div>
     </div>
    )}
   </div>

    <div className="space-y-8">
     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-card border border-border shadow-sm/50 rounded-3xl border border-white/5 p-8 space-y-6 relative overflow-hidden h-full">
       <div className={`absolute top-0 inset-x-0 h-1 ${locale === 'ar' ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-emerald-500/50 to-transparent`} />
       <div className="flex justify-between items-start">
        <div className="space-y-1">
         <span className="text-label-xs font-semibold uppercase text-muted-foreground/50">{t('destination')}</span>
         <p className="text-title-lg font-semibold">{transfer.toWarehouseName}</p>
        </div>
        <div className="bg-muted/50 p-3 rounded-2xl">
         <PackageCheck className="w-6 h-6 text-foreground" />
        </div>
       </div>

       <div className="pt-4 border-t border-white/5 space-y-4">
        <div className="space-y-2">
         <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{tCommon('notes')}</label>
         <p className="text-body-md font-medium text-foreground/80 leading-relaxed bg-surface-container-highest/20 p-3 rounded-xl border border-white/5">
          {transfer.notes || '—'}
         </p>
        </div>
       </div>
      </div>

      <div className={cn(
       "bg-card border border-border shadow-sm/50 rounded-3xl border p-8 space-y-4 transition-all duration-500",
       hasVariance ? 'border-status-warning/40 shadow-xl shadow-status-warning/5' : 'border-white/5'
      )}>
       <div className="flex items-center justify-between">
        <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('variance_reason')}</label>
        {hasVariance && (
         <span className={cn(
          "text-label-xxs font-bold px-2 py-0.5 rounded-full",
          varianceReason.trim().length >= 15 
           ? 'bg-muted/50 text-foreground border border-emerald-500/20' 
           : 'bg-status-error/10 text-status-error border border-status-error/20'
         )}>
          {varianceReason.trim().length}/15
         </span>
        )}
       </div>
       <textarea
        value={varianceReason}
        onChange={e => setVarianceReason(e.target.value)}
        disabled={!hasVariance || isMutationBlocked}
        placeholder={t('variance_reason_placeholder')}
        className={cn(
         "w-full bg-surface-container-highest/40 border rounded-2xl p-4 font-medium text-body-md focus:ring-2 transition-all outline-none resize-none min-h-[140px]",
         hasVariance 
          ? 'border-status-warning/20 focus:ring-status-warning/30 hover:bg-surface-container-highest/60' 
          : 'border-white/5 opacity-40 cursor-not-allowed',
         isMutationBlocked ? 'opacity-40 cursor-not-allowed' : ''
        )}
       />
       {!isVarianceValid && hasVariance && (
        <p className="text-label-xs font-bold text-status-error animate-pulse flex items-center gap-1">
         <AlertCircle className="w-3 h-3" />
         {t('variance_required_error')}
        </p>
       )}
      </div>
     </div>

     <div className="bg-card border border-border shadow-sm/30 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-card border border-border shadow-sm">
       <div className="flex items-center gap-4">
        <h3 className="text-label-xs font-semibold uppercase text-foreground">{t('items_to_receive')}</h3>
        <div className="h-4 w-px bg-card/10" />
        <span className="text-label-xs font-bold text-muted-foreground/60">{lines.length} {tCommon('items')}</span>
       </div>
       <div className="flex items-center gap-4">
        {!isMutationBlocked && (
         <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReceiveAll}
          className="h-8 px-4 border-emerald-500/20 text-foreground hover:bg-muted/50 hover:text-foreground font-semibold text-label-xs uppercase transition-all"
         >
          <RefreshCw className="w-3.5 h-3.5 me-2" />
          {t('receive_all') || 'Receive All'}
         </Button>
        )}
        <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full border border-emerald-500/20">
         <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
         <span className="text-label-xxs font-semibold uppercase text-foreground">{t('scan_mode')}</span>
        </div>
       </div>
      </div>

      <div className="p-6 bg-card border border-border shadow-sm/50 border-b border-white/5">
       <ScanInput
        onScan={handleScan}
        placeholder={t('scan_placeholder_receive')}
        scanStatus={scanStatus}
        statusMessage={statusMessage}
        scannerMode={true}
        size="lg"
        className="max-w-md mx-auto"
       />
      </div>

      <DocumentLineItemTable
       lines={lines}
       locale={locale}
       isReadOnly={isMutationBlocked}
       dense={true}
       onRemoveLine={() => {}}
       hideLotColumns={!lines.some(l => l.lotAllocations && l.lotAllocations.length > 0)}
       headers={{
        code: tCommon('table_headers.code'),
        name: tCommon('table_headers.name'),
        qty: t('transfer_qty'),
        uom: tCommon('table_headers.uom'),
       }}
       extraColumns={[
        {
         header: t('shipped_qty'),
         cell: (line: TransferLine & { _receivedQty?: number }) => (
          <div className="flex justify-center">
           <span dir="ltr" className="font-mono text-body-md font-semibold bg-surface-container-highest px-3 py-1 rounded-lg border border-white/5">
            {line.shippedQty ?? line.qty}
           </span>
          </div>
         ),
        },
        {
         header: t('received_qty'),
         cell: (line: TransferLine & { _receivedQty?: number; _lotReceives?: Record<string, number> }) => {
          const hasLots = line.lotAllocations && line.lotAllocations.length > 0;
          const displayQty = hasLots && line._lotReceives
           ? Object.values(line._lotReceives).reduce((sum, q) => sum + q, 0)
           : (line._receivedQty ?? line.qty);
          return (
           <div className="flex justify-center">
            <input
             type="number"
             dir="ltr"
             disabled={isMutationBlocked || hasLots}
             className={cn(
              "w-24 bg-surface-container-highest border rounded-lg text-center px-2 py-2 font-mono font-bold focus:ring-2 outline-none transition-all",
              isMutationBlocked || hasLots ? 'opacity-40 cursor-not-allowed' : '',
              displayQty !== (line.shippedQty ?? line.qty) 
               ? 'text-status-warning border-status-warning/40 focus:ring-status-warning/30 shadow-[0_0_15px_rgba(255,152,0,0.1)]' 
               : 'text-foreground border-emerald-500/20 focus:ring-emerald-500/30'
             )}
             value={displayQty}
             onChange={e => {
              const val = Number(e.target.value);
              setLines(prev =>
               prev.map(l => l.id === line.id ? { ...l, _receivedQty: val } : l)
              );
             }}
            />
           </div>
          );
         },
        },
        ...(lines.some(l => l.lotAllocations && l.lotAllocations.length > 0)
         ? [{
           header: t('lot') || 'Lots',
           cell: (line: TransferLine & { _receivedQty?: number; _lotReceives?: Record<string, number> }) => {
            const hasLots = line.lotAllocations && line.lotAllocations.length > 0;
            if (!hasLots) return <span className="text-muted-foreground/30 text-label-xs">—</span>;
            return (
             <div className="flex justify-center">
              <button
               type="button"
               disabled={isMutationBlocked}
               onClick={() => setLotModalLine(line)}
               className="text-primary underline underline-offset-4 decoration-dotted decoration-primary/40 hover:decoration-primary text-label-xs font-semibold uppercase transition-all disabled:opacity-40"
              >
               {t('allocate_lot') || 'Lots'}
              </button>
             </div>
            );
           },
          } as { header: string; cell: (line: TransferLine & { _receivedQty?: number; _lotReceives?: Record<string, number> }) => React.ReactNode }]
         : []),
       ]}
      />
     </div>
    </div>

   <FormFooter
    onCancel={() => router.push(`/transfers/${id}`, { skipGuard: true })}
    actions={
     <PermissionGate action="post" resource="transfer">
      <Button
       type="submit"
       disabled={isMutationBlocked || receiveTransfer.isPending || !isVarianceValid}
       className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-14 px-12 text-label-xs font-black uppercase tracking-widest transition-all shadow-2xl shadow-emerald-600/30 border-none min-w-[240px]"
      >
       <PackageCheck className="w-5 h-5 me-3" />
       {t('complete_receive')}
      </Button>
     </PermissionGate>
    }
   />

   <PostConfirmDialog
    open={confirmDialogOpen}
    onOpenChange={setConfirmDialogOpen}
    title={t('receive_confirm_title')}
    description={t('receive_confirm_desc')}
    warningText={t('receive_confirm_warning')}
    requiresTextConfirmation={true}
    onConfirm={handleReceive}
    isLoading={receiveTransfer.isPending}
   />

   <Dialog open={lotModalLine !== null} onOpenChange={(open) => { if (!open) setLotModalLine(null); }}>
    <DialogContent className="sm:max-w-[500px] bg-surface-container-high border-none rounded-[2rem] shadow-2xl p-8">
     <DialogHeader>
      <DialogTitle className="text-title-lg font-semibold">{t('lot_allocation') || 'Lot Allocation'}</DialogTitle>
      <DialogDescription className="text-muted-foreground/60">
       {t('lot_allocation_desc') || 'Set received quantities per lot'}
      </DialogDescription>
     </DialogHeader>
      <div className="py-4 space-y-4">
      {lotModalLine && lotModalLine.lotAllocations?.map((la) => (
       <div key={la.lotId} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm border border-white/5">
        <div className="flex-1 space-y-1">
         <span className="font-mono font-bold text-label-sm">{la.lotNumber}</span>
         {la.expiryDate && (
          <p className="text-label-xs text-muted-foreground/50">
           {tCommon('expiry') || 'Expiry'}: {formatDate(la.expiryDate, locale as 'ar' | 'en')}
          </p>
         )}
        </div>
        <Label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{tCommon('qty') || 'Qty'}</Label>
        <input
         type="number"
         dir="ltr"
         disabled={isMutationBlocked}
         className="w-24 bg-surface-container-highest border rounded-lg text-center px-2 py-2 font-mono font-bold focus:ring-2 outline-none transition-all text-foreground border-emerald-500/20 focus:ring-emerald-500/30"
         value={lotModalLine._lotReceives?.[la.lotId] ?? la.allocatedQty}
         onChange={(e) => {
          const val = Number(e.target.value);
          setLotModalLine(prev => {
           if (!prev) return prev;
           return {
            ...prev,
            _lotReceives: { ...prev._lotReceives, [la.lotId]: val },
           };
          });
          setLines(prev =>
           prev.map(l =>
            l.id === lotModalLine.id
             ? { ...l, _lotReceives: { ...(l._lotReceives || {}), [la.lotId]: val } }
             : l
           )
          );
         }}
        />
       </div>
      ))}
     </div>
     <DialogFooter className="pt-2">
      <Button
       type="button"
       variant="ghost"
       onClick={() => setLotModalLine(null)}
       className="rounded-xl font-semibold text-label-xs uppercase"
      >
       {tCommon('done') || 'Done'}
      </Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   <ConflictDialog 
    open={open}
    onReload={handleReload}
    onClose={handleClose}
   />
  </form>
 );
}
