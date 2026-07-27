'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { 
 ArrowLeft, 
 CheckCircle2, 
 PackageCheck, 
 Clock, 
 User, 
 Building2, 
 Warehouse, 
 FileText,
 History,
 AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatusTimeline, type StatusTimelineEntry } from '@/components/shared/StatusTimeline';
import { 
 useUpdateKitchenRequestStatus, 
 useFulfillKitchenRequest 
} from '@/features/operations/hooks/useKitchenRequests';
import { 
 KitchenRequestDetail, 
 KitchenRequestItem 
} from '@/features/operations/types/kitchen-request';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Status } from '@/components/shared/StatusTimeline';
import { useAuth } from '@/providers/AuthProvider';
import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import { 
 canPerformActionV2,
 isDocumentLocked,
 DocumentStatus 
} from '@logirest/shared-types';
import { resolveUomCode } from '@/utils/uom-helper';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { KITCHEN_REQUEST_STATUS } from '@logirest/shared-types';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { LockBanner } from '@/components/shared/LockBanner';
import { audioAlerts } from '@/utils/audio';
import { toast } from '@/hooks/use-toast';
import { DocumentLineItemTable, getItemImage, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';

interface KitchenRequestLineItem extends LineItem {
 fulfilledQty: number;
 notes: string | null;
}

interface KitchenRequestFormProps {
 request: KitchenRequestDetail;
 locale: 'ar' | 'en';
}

export function KitchenRequestForm({ request, locale }: KitchenRequestFormProps) {
 const t = useTranslations('operations.kitchen_request');
 const tCommon = useTranslations('common');
 const router = useRouter();
 const { user } = useAuth();
 const id = request.id;
 
 const updateStatus = useUpdateKitchenRequestStatus();
 const fulfillRequest = useFulfillKitchenRequest();
 
 const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
 const [rejectionReason, setRejectionReason] = useState('');
 
 const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false);
 const [fulfillmentData, setFulfillmentData] = useState<{ itemId: string; fulfilledQty: number }[]>([]);

 const { data: warehouseLockState } = useWarehouseLock(request.warehouseId || null);
 const isWriteBlocked = updateStatus.isPending || fulfillRequest.isPending || fulfillRequest.isSuccess || !!warehouseLockState?.isLocked;

 const status = request.status as DocumentStatus;

 const showFulfilled = useMemo(() => {
  return canPerformActionV2('KITCHEN_REQUEST', status, 'INTERNAL_MOVEMENT', user?.role);
 }, [status, user?.role]);

 const tableLines = useMemo((): KitchenRequestLineItem[] => {
  return request.items.map((item) => {
   const rawBarcode = item.barcode || item.itemBarcode || item.itemCode;
   const displayBarcode = (rawBarcode && rawBarcode !== 'N/A') ? rawBarcode : '—';
   return {
    id: item.id,
    item: {
     id: item.itemId,
     code: displayBarcode,
     barcode: displayBarcode,
     nameEn: item.itemName,
     nameAr: item.itemName,
     primaryUom: { code: item.uom },
     image: item.itemImage || item.image || null
    },
    qty: item.quantity,
    fulfilledQty: item.fulfilledQuantity ?? 0,
    uomId: '',
    lot: null,
    notes: item.notes ?? null,
   };
  });
 }, [request.items]);

 const extraColumns = useMemo(() => {
  const cols = [];
  if (showFulfilled) {
   cols.push({
    header: t('fulfilled') || 'Fulfilled',
    cell: (line: KitchenRequestLineItem) => (
     <span className={cn(
      "text-body-md font-semibold tabular-nums",
      (line.fulfilledQty || 0) < line.qty ? "text-amber-500" : "text-foreground"
     )}>{line.fulfilledQty || 0}</span>
    )
   });
  }
  cols.push({
   header: tCommon('notes') || 'Notes',
   cell: (line: KitchenRequestLineItem) => (
    <p className="text-label-xs font-medium text-muted-foreground/60 max-w-[200px] line-clamp-2 italic">
     {line.notes || '—'}
    </p>
   )
  });
  return cols;
 }, [showFulfilled, t, tCommon]);

 const history = useMemo((): StatusTimelineEntry[] => {
  const h: StatusTimelineEntry[] = [
   { status: 'draft' as Status, at: request.createdAt, by: request.requestedBy }
  ];
  if (!canPerformActionV2('KITCHEN_REQUEST', request.status as DocumentStatus, 'SUBMIT', user?.role)) {
   h.push({ status: 'submitted' as Status, at: request.requestedAt, by: request.requestedBy });
  }
  if (request.approvedAt) {
   h.push({ status: 'approved' as Status, at: request.approvedAt, by: request.approvedBy || 'Approver' });
  }
  if (request.rejectedAt) {
   h.push({ status: 'rejected' as Status, at: request.rejectedAt, by: request.rejectedBy || 'Rejecter' });
  }
  if (request.status === 'CANCELLED') {
   h.push({ status: 'cancelled' as Status, at: request.updatedAt || request.createdAt, by: request.rejectedBy || 'System' });
  }
  if (request.fulfilledAt) {
   h.push({ status: request.status.toLowerCase() as Status, at: request.fulfilledAt, by: request.fulfilledBy || 'Store Keeper' });
  }
  return h;
 }, [request, user?.role]);

 const handleApprove = async () => {
  if (warehouseLockState?.isLocked) {
   audioAlerts.playScanBlocked();
   toast.error(t('warehouse_locked_cannot_mutate') || 'Warehouse is locked. Cannot perform this action.');
   return;
  }
  try {
   await updateStatus.mutateAsync({ 
    id, 
    status: KITCHEN_REQUEST_STATUS.APPROVED, 
    version: request.version ?? 0,
    headers: { 'X-Idempotency-Key': crypto.randomUUID() }
   });
  } catch (error) {
   console.error('Failed to approve request', error);
  }
 };

 const handleSubmit = async () => {
  if (warehouseLockState?.isLocked) {
   audioAlerts.playScanBlocked();
   toast.error(t('warehouse_locked_cannot_mutate') || 'Warehouse is locked. Cannot perform this action.');
   return;
  }
  try {
   await updateStatus.mutateAsync({ 
    id, 
    status: KITCHEN_REQUEST_STATUS.SUBMITTED, 
    version: request.version ?? 0,
    headers: { 'X-Idempotency-Key': crypto.randomUUID() }
   });
   toast.success(locale === 'ar' ? 'تم تقديم الطلب بنجاح' : 'Request submitted successfully');
  } catch (error) {
   console.error('Failed to submit request', error);
  }
 };

 const handleReject = async () => {
  if (warehouseLockState?.isLocked) {
   audioAlerts.playScanBlocked();
   toast.error(t('warehouse_locked_cannot_mutate') || 'Warehouse is locked. Cannot perform this action.');
   return;
  }
  const trimmedReason = rejectionReason.trim();
  if (trimmedReason.length < 15) return;
  try {
   await updateStatus.mutateAsync({ 
    id, 
    status: KITCHEN_REQUEST_STATUS.CANCELLED, 
    reason: trimmedReason, 
    version: request.version ?? 0,
    headers: { 'X-Idempotency-Key': crypto.randomUUID() }
   });
   setRejectDialogOpen(false);
  } catch (error) {
   console.error('Failed to reject request', error);
  }
 };

 const handleFulfill = async () => {
  if (warehouseLockState?.isLocked) {
   audioAlerts.playScanBlocked();
   toast.error(t('warehouse_locked_cannot_mutate') || 'Warehouse is locked. Cannot perform this action.');
   return;
  }
  try {
   await fulfillRequest.mutateAsync({ 
    id, 
    fulfillments: fulfillmentData, 
    version: request.version ?? 0,
    headers: { 'X-Idempotency-Key': crypto.randomUUID() }
   });
   setFulfillDialogOpen(false);
  } catch (error) {
   console.error('Failed to fulfill request', error);
   throw error;
  }
 };

 const openFulfillDialog = () => {
  setFulfillmentData(
   request.items.map((item: KitchenRequestItem) => ({
    itemId: item.itemId,
    fulfilledQty: item.quantity
   }))
  );
  setFulfillDialogOpen(true);
 };

 const isDocLocked = isDocumentLocked('KITCHEN_REQUEST', status);
 const workflowActions = (
  <div className="flex flex-col md:flex-row-reverse justify-end items-center gap-4 mt-6 pt-4 border-t border-border/20 w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
   <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="FULFILL" role={user?.role}>
    <Button 
     disabled={isWriteBlocked}
     variant="outline"
     className="w-full md:w-auto px-6 py-2.5 bg-operational-cyan text-foreground font-bold rounded-lg shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-opacity border-none"
     onClick={openFulfillDialog}
    >
     <PackageCheck className="w-5 h-5" />
     {t('fulfill')}
    </Button>
   </ActionGuard>

   <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="APPROVE" role={user?.role}>
    <Button 
     disabled={isWriteBlocked}
     variant="outline"
     className="w-full md:w-auto px-6 py-2.5 bg-status-success text-white font-bold rounded-lg shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-opacity border-none"
     onClick={handleApprove}
    >
     <CheckCircle2 className="w-5 h-5" />
     {t('approve')}
    </Button>
   </ActionGuard>

   <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="SUBMIT" role={user?.role}>
    <Button 
     disabled={isWriteBlocked}
     variant="outline"
     className="w-full md:w-auto px-6 py-2.5 bg-operational-cyan text-foreground font-bold rounded-lg shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-opacity border-none"
     onClick={handleSubmit}
    >
     <CheckCircle2 className="w-5 h-5" />
     {t('submit_request') || 'Submit Request'}
    </Button>
   </ActionGuard>

   <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="CANCEL" role={user?.role}>
    <Button 
     type="button"
     variant="ghost"
     disabled={isWriteBlocked}
     className="text-status-error font-bold px-4 py-2 rounded-lg hover:bg-status-error/10 transition-colors w-full md:w-auto text-center border-none shadow-none"
     onClick={() => setRejectDialogOpen(true)}
    >
     {t('cancel_request') || 'Cancel Request'}
    </Button>
   </ActionGuard>
  </div>
 );

 return (
  <div className="min-h-screen flex flex-col animate-in fade-in duration-200 pb-32">
   <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 w-full space-y-8">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
     <div data-slot="page-header" className="space-y-4">
      <Breadcrumb 
       items={[
        { label: tCommon('inventory'), href: '#' },
        { label: t('title'), href: "/kitchen-requests" },
        { label: request.requestNumber }
       ]} 
      />
      <div className="flex items-center gap-4">
       <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-lg">
        <ArrowLeft className={cn("w-5 h-5", locale === 'ar' && "rotate-180")} />
       </Button>
       <div>
        <h1 className="text-2xl font-black not-italic text-foreground uppercase">{request.requestNumber}</h1>
        <div className="flex items-center gap-3 mt-1">
         <StatusBadge status={request.status} />
         <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <ClientOnlyTime date={request.createdAt} mode="date" locale={locale} className="tabular-nums" />
         </span>
        </div>
       </div>
      </div>
     </div>
    </div>

    <form 
     onSubmit={(e) => e.preventDefault()}
     className="space-y-10"
    >
     <DocumentLockBanner isLocked={isDocLocked} status={status} />
     <LockBanner lockState={warehouseLockState} />

     <DocumentLockWrapper isLocked={isDocLocked && status !== KITCHEN_REQUEST_STATUS.SUBMITTED}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
       {/* Left Column: Details and Items */}
       <div className="lg:col-span-8 space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-100">
        <div className={cn(
         "bg-surface-lowest/80 dark:bg-surface-container/80 backdrop-blur-xl shadow-lg hover:shadow-xl p-6 px-7 rounded-3xl border border-border/30 grid grid-cols-1 gap-8 relative overflow-hidden group transition-all duration-300",
         request.issueId ? "md:grid-cols-4" : "md:grid-cols-3"
        )}>
         {/* Subtle Ambient Background */}
         <div className="absolute top-0 end-0 w-48 h-48 bg-operational-cyan/5 dark:bg-operational-cyan/10 rounded-full blur-3xl -z-10 group-hover:scale-110 group-hover:bg-operational-cyan/10 transition-all duration-700" />
         <div className="absolute bottom-0 start-0 w-32 h-32 bg-status-success/5 dark:bg-status-success/10 rounded-full blur-2xl -z-10 group-hover:scale-125 transition-all duration-700 delay-100" />

         <div className="space-y-2 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2 mb-1">
           <div className="p-1.5 rounded-lg bg-surface-container-high dark:bg-surface-lowest shadow-sm border border-border/40">
            <Building2 className="w-3.5 h-3.5 text-operational-cyan" />
           </div>
           {t('department')}
          </span>
          <p className="text-body-lg font-black tracking-tight text-foreground/90">{request.departmentName}</p>
         </div>

         <div className="space-y-2 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2 mb-1">
           <div className="p-1.5 rounded-lg bg-surface-container-high dark:bg-surface-lowest shadow-sm border border-border/40">
            <Warehouse className="w-3.5 h-3.5 text-operational-cyan" />
           </div>
           {t('warehouse')}
          </span>
          <p className="text-body-lg font-black tracking-tight text-foreground/90">{request.warehouseName}</p>
         </div>

         <div className="space-y-2 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2 mb-1">
           <div className="p-1.5 rounded-lg bg-surface-container-high dark:bg-surface-lowest shadow-sm border border-border/40">
            <User className="w-3.5 h-3.5 text-operational-cyan" />
           </div>
           {t('requested_by')}
          </span>
          <p className="text-body-lg font-black tracking-tight text-foreground/90">{request.requestedBy}</p>
         </div>

         {request.issueId && (
          <div className="space-y-2 relative z-10">
           <span className="text-[10px] font-black uppercase tracking-widest text-operational-cyan/70 flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-operational-cyan/10 shadow-sm border border-operational-cyan/20">
             <FileText className="w-3.5 h-3.5 text-operational-cyan" />
            </div>
            {t('stock_issue')}
           </span>
           <p className="text-body-lg font-black tracking-tight">
            <Link 
             href={`/issues/${request.issueId}`} 
             className="text-operational-cyan hover:text-operational-cyan/80 hover:underline underline-offset-4 decoration-operational-cyan/30 transition-all"
            >
             {t('view_stock_issue')}
            </Link>
           </p>
          </div>
         )}

         {request.notes && (
          <div className={cn(
           "pt-5 border-t border-border/30 space-y-2 relative z-10",
           request.issueId ? "md:col-span-4" : "md:col-span-3"
          )}>
           <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2 mb-1">
            <FileText className="w-3.5 h-3.5" />
            {tCommon('notes')}
           </span>
           <div className="bg-surface-container-lowest/50 dark:bg-surface-lowest/50 p-4 rounded-2xl border border-border/40">
            <p className="text-label-sm text-foreground/80 italic leading-relaxed font-medium">&quot;{request.notes}&quot;</p>
           </div>
          </div>
         )}

         {status !== KITCHEN_REQUEST_STATUS.DRAFT && request.rejectionReason && (
          <div className={cn(
           "p-5 bg-status-error/5 border border-status-error/15 rounded-2xl space-y-2 relative z-10 transition-all hover:bg-status-error/10 hover:border-status-error/30",
           request.issueId ? "md:col-span-4" : "md:col-span-3"
          )}>
           <span className="text-[10px] font-black uppercase tracking-widest text-status-error/70 flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-status-error animate-pulse" />
            {t('rejection_reason_label')}
           </span>
           <p className="text-body-md font-bold text-status-error/90">{request.rejectionReason}</p>
          </div>
         )}
        </div>

         {/* Items Section */}
         <div className="bg-surface-lowest dark:bg-surface-container shadow-sm rounded-2xl border-0 overflow-hidden">
          <div className="p-5 px-6 border-b border-border/20 flex justify-between items-center">
           <div className="flex items-center gap-4">
            <div className="w-1.5 h-6 bg-operational-cyan rounded-full" />
            <h3 className="text-label-sm font-semibold uppercase">{t('items')}</h3>
           </div>
           <Badge variant="outline" className="rounded-lg text-label-xxs font-semibold px-3 py-1 border-none bg-surface-container-high text-muted-foreground">
            {request.items.length} {t('entries')}
           </Badge>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
           <DocumentLineItemTable
            lines={tableLines}
            locale={locale}
            isReadOnly={true}
            hideLotColumns={true}
            headers={{
             code: tCommon('table_headers.code'),
             name: tCommon('table_headers.name'),
             qty: tCommon('table_headers.qty'),
             uom: tCommon('table_headers.uom'),
            }}
            renderQty={(line) => (
             <span className="text-body-md font-semibold text-foreground tabular-nums">
              {line.qty}
             </span>
            )}
            renderUom={(line) => (
             <span className="text-label-xxs font-semibold uppercase text-muted-foreground/40 font-mono">
              {resolveUomCode(line.uomId, line.item, null, 'PCS')}
             </span>
            )}
            extraColumns={extraColumns}
           />
          </div>

          {/* Sleek, Compact Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden p-3">
           {tableLines.map((line) => {
            const imgSrc = getItemImage(line.item);
            const itemName = locale === 'ar'
             ? (line.item.nameAr || line.item.nameEn)
             : (line.item.nameEn || line.item.nameAr);
            const barcodeText = line.item.code || '—';

            return (
             <div
              key={line.id}
              className="bg-surface-lowest/80 dark:bg-surface-container/80 backdrop-blur-md border border-border/40 rounded-2xl p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden transition-all group hover:shadow-md"
             >
              {/* Optional Subtle Glow */}
              <div className="absolute top-0 end-0 w-24 h-24 bg-operational-cyan/5 rounded-full blur-2xl -z-10 group-hover:bg-operational-cyan/10 transition-colors duration-500" />
              
              {/* Row 1: Product Image & Name / Barcode on Start | Quantity & UOM side-by-side on End */}
              <div className="flex items-center justify-between gap-4 min-w-0">
               {/* Start: Image & Item Details */}
               <div className="flex items-center gap-3 min-w-0 flex-1">
                {imgSrc ? (
                 <img
                  src={imgSrc}
                  alt={itemName || 'Product'}
                  className="w-12 h-12 object-cover rounded-xl border border-border/50 shrink-0 shadow-sm"
                 />
                ) : (
                 <div className="w-12 h-12 bg-surface-container-high flex items-center justify-center rounded-xl border border-border/40 text-[10px] text-muted-foreground/60 font-mono font-bold shrink-0">
                  N/A
                 </div>
                )}
                <div className="flex flex-col min-w-0 flex-1">
                 <span className="font-black text-foreground text-sm truncate leading-tight text-start">
                  {itemName}
                 </span>
                 <div className="mt-1 text-start w-full truncate">
                  <span className="font-mono text-[11px] text-muted-foreground/80 font-bold" dir="ltr">
                   {barcodeText}
                  </span>
                 </div>
                </div>
               </div>

               {/* End: Quantity & UOM next to Item */}
               <div className="flex flex-col items-end shrink-0 bg-operational-cyan/10 dark:bg-operational-cyan/5 p-2 px-3 rounded-xl border border-operational-cyan/20 text-end shadow-sm">
                <div className="flex items-baseline gap-1.5">
                 <span className="text-sm font-black text-operational-cyan tabular-nums">{line.qty}</span>
                 <span className="text-[10px] font-bold text-operational-cyan/70 uppercase">{line.item.primaryUom?.code || '---'}</span>
                </div>
                {showFulfilled && (
                 <span className="text-[10px] font-bold text-amber-500 tabular-nums mt-0.5">
                  {t('fulfilled') || 'Fulfilled'}: {line.fulfilledQty || 0}
                 </span>
                )}
               </div>
              </div>

              {/* Row 2: Notes */}
              <div className="pt-3 border-t border-border/30 flex items-center gap-2 text-xs text-start">
               <span className="font-black text-[10px] text-muted-foreground/50 uppercase tracking-widest shrink-0">
                {tCommon('notes') || 'Notes'}:
               </span>
               <span className={cn(
                "truncate text-xs font-medium",
                line.notes ? "text-foreground/90 italic" : "text-muted-foreground/40"
               )}>
                {line.notes || '—'}
               </span>
              </div>
             </div>
            );
           })}
          </div>
         </div>
        </div>

        {/* Right Column: Timeline and Meta */}
        <div className="lg:col-span-4 space-y-8">
         <div className="bg-surface-lowest dark:bg-surface-container shadow-sm border-0 p-8 rounded-2xl relative overflow-hidden group">
          <div className="relative space-y-8">
           <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
             <History className="w-5 h-5 text-foreground" />
            </div>
            <h4 className="text-label-xs font-semibold uppercase">{tCommon('history')}</h4>
           </div>
           <div className="ps-2">
            <StatusTimeline entries={history} />
           </div>
          </div>
         </div>
        </div>
       </div>
      </DocumentLockWrapper>
      {workflowActions}
     </form>
    </div>

    {/* Dialogs */}
    <PostConfirmDialog
     open={rejectDialogOpen}
     onOpenChange={setRejectDialogOpen}
     title={t('cancel_request') || 'Cancel Request'}
     description={t('cancellation_reason_description') || "Please provide a reason for cancelling this request."}
     onConfirm={handleReject}
     variant="destructive"
     icon="reject"
     confirmText={t('confirm_cancellation') || 'Confirm Cancellation'}
     disabled={rejectionReason.trim().length < 15 || isWriteBlocked}
    >
     <div className="space-y-4">
      <label className="text-label-xs font-bold text-muted-foreground/40 uppercase ms-1">
       {t('cancellation_reason_label') || 'Cancellation Reason'}
      </label>
      <Textarea 
       placeholder={t('cancellation_reason_placeholder') || 'Enter cancellation reason...'}
       disabled={isWriteBlocked}
       aria-label={t('cancellation_reason_label') || 'Cancellation Reason'}
       className="bg-surface-container-high/40 border-none rounded-2xl p-5 text-body-md font-medium min-h-[120px] focus:ring-1 focus:ring-operational-cyan/30 resize-none transition-all"
       value={rejectionReason}
       onChange={(e) => setRejectionReason(e.target.value)}
      />
      {rejectionReason.trim().length > 0 && rejectionReason.trim().length < 15 && (
       <div className="flex items-center gap-2 text-status-error p-3 bg-status-error/5 rounded-xl border border-status-error/10">
        <AlertCircle className="w-3.5 h-3.5" />
        <p className="text-label-xxs font-bold uppercase">
         {tCommon('min_chars_required', { count: 15 - rejectionReason.trim().length })}
        </p>
       </div>
      )}
     </div>
    </PostConfirmDialog>

    <PostConfirmDialog
     open={fulfillDialogOpen}
     onOpenChange={setFulfillDialogOpen}
     title={t('fulfill')}
     description={t('fulfillment_desc')}
     onConfirm={handleFulfill}
     variant="default"
     icon="info"
     confirmText={t('post_fulfillment')}
     disabled={isWriteBlocked}
     className="max-w-2xl"
    >
     <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
      {request.items.map((item: KitchenRequestItem) => (
       <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr] gap-4 items-center p-4 bg-surface-container-high/30 rounded-2xl border border-surface-container-high/50">
        <div className="space-y-1">
         <p className="text-label-sm font-bold">{item.itemName}</p>
         <p className="text-label-xxs font-semibold text-muted-foreground/40 uppercase">{t('requested')}: {item.quantity} {item.uom}</p>
        </div>
        <div className="text-center">
         <span className="text-label-xxs font-semibold text-muted-foreground/60 uppercase mb-2 block">{t('fulfilling')}</span>
         <Input 
          type="number"
          step="0.01"
          dir="ltr"
          disabled={isWriteBlocked}
          aria-label={t('fulfilling') + " " + item.itemName}
          className="bg-surface-container border-0 text-foreground h-11 text-center font-semibold text-body-md rounded-xl transition-all focus:ring-1 focus:ring-operational-cyan/30 w-full"
          value={fulfillmentData.find(f => f.itemId === item.itemId)?.fulfilledQty || 0}
          onChange={(e) => {
           const val = Number(e.target.value);
           setFulfillmentData(prev => prev.map(f => f.itemId === item.itemId ? { ...f, fulfilledQty: val } : f));
          }}
         />
        </div>
        <div className="text-center pt-5">
         <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">{item.uom}</span>
        </div>
       </div>
      ))}
     </div>
    </PostConfirmDialog>
   </div>
  );
 }
