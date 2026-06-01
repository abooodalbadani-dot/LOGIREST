'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  PackageCheck, 
  Clock, 
  User, 
  Building2, 
  Warehouse, 
  FileText,
  History,
  AlertCircle,
  Sparkles
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Status } from '@/components/shared/StatusTimeline';
import { useAuth } from '@/providers/AuthProvider';
import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import { FormFooter } from '@/components/shared/FormFooter';
import { 
  canPerformActionV2,
  isDocumentLocked,
  DocumentStatus 
} from '@logirest/shared-types';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { KITCHEN_REQUEST_STATUS, KitchenRequestStatus } from '@logirest/shared-types';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { LockBanner } from '@/components/shared/LockBanner';
import { audioAlerts } from '@/utils/audio';
import { toast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';

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
  const [fulfillmentData, setFulfillmentData] = useState<{ item_id: string; fulfilled_quantity: number }[]>([]);
  const [isSuggestingFIFO, setIsSuggestingFIFO] = useState(false);

  const { data: warehouseLockState } = useWarehouseLock(request.warehouse_id || null);
  const isWriteBlocked = updateStatus.isPending || fulfillRequest.isPending || !!warehouseLockState?.isLocked;

  const status = request.status as DocumentStatus;

  const showFulfilled = useMemo(() => {
    return canPerformActionV2('KITCHEN_REQUEST', status, 'INTERNAL_MOVEMENT', user?.role);
  }, [status, user?.role]);

  const tableLines = useMemo((): KitchenRequestLineItem[] => {
    return request.items.map((item) => ({
      id: item.id,
      item: {
        id: item.item_id,
        code: item.item_id,
        name_en: item.item_name,
        name_ar: item.item_name,
        primary_uom: { code: item.uom }
      },
      qty: item.quantity,
      fulfilledQty: item.fulfilled_quantity ?? 0,
      uom_id: '',
      lot: null,
      notes: item.notes ?? null,
    }));
  }, [request.items]);

  const extraColumns = useMemo(() => {
    const cols = [];
    if (showFulfilled) {
      cols.push({
        header: t('fulfilled') || 'Fulfilled',
        cell: (line: KitchenRequestLineItem) => (
          <span className={cn(
            "text-body-md font-semibold tabular-nums",
            (line.fulfilledQty || 0) < line.qty ? "text-amber-500" : "text-emerald-500"
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
      { status: 'draft' as Status, at: request.created_at, by: request.requested_by }
    ];
    if (!canPerformActionV2('KITCHEN_REQUEST', request.status as DocumentStatus, 'SUBMIT', user?.role)) {
      h.push({ status: 'submitted' as Status, at: request.requested_at, by: request.requested_by });
    }
    if (request.approved_at) {
      h.push({ status: 'approved' as Status, at: request.approved_at, by: request.approved_by || 'Approver' });
    }
    if (request.rejected_at) {
      h.push({ status: 'rejected' as Status, at: request.rejected_at, by: request.rejected_by || 'Rejecter' });
    }
    if (request.status === 'CANCELLED') {
      h.push({ status: 'cancelled' as Status, at: request.updated_at || request.created_at, by: request.rejected_by || 'System' });
    }
    if (request.fulfilled_at) {
      h.push({ status: request.status.toLowerCase() as Status, at: request.fulfilled_at, by: request.fulfilled_by || 'Store Keeper' });
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
        items: fulfillmentData, 
        version: request.version ?? 0,
        headers: { 'X-Idempotency-Key': crypto.randomUUID() }
      });
      setFulfillDialogOpen(false);
    } catch (error) {
      console.error('Failed to fulfill request', error);
    }
  };

  const openFulfillDialog = () => {
    setFulfillmentData(
      request.items.map((item: KitchenRequestItem) => ({
        item_id: item.item_id,
        fulfilled_quantity: item.quantity
      }))
    );
    setFulfillDialogOpen(true);
  };

  const handleSuggestFIFO = async () => {
    if (!request.warehouse_id) return;
    setIsSuggestingFIFO(true);
    try {
      const itemIds = request.items.map(i => i.item_id);
      const qs = new URLSearchParams();
      qs.append('warehouse_id', request.warehouse_id);
      itemIds.forEach(id => qs.append('item_id', id));

      const res = await apiClient.get(`/operations/lots-available?${qs.toString()}`, z.object({
        data: z.array(z.object({
          item_id: z.string(),
          lot_number: z.string(),
          expiry_date: z.string().nullable().optional(),
          qty_available: z.number().optional(),
        }))
      }));

      const lots = res.data;
      const prioritized: Record<string, number> = {};
      for (const item of request.items) {
        const itemLots = lots
          .filter(l => l.item_id === item.item_id)
          .sort((a, b) => {
            if (!a.expiry_date) return 1;
            if (!b.expiry_date) return -1;
            return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
          });
        const totalAvailable = itemLots.reduce((sum, l) => sum + (l.qty_available || 0), 0);
        prioritized[item.item_id] = Math.min(totalAvailable, item.quantity);
      }

      setFulfillmentData(prev => prev.map(f => ({
        ...f,
        fulfilled_quantity: prioritized[f.item_id] ?? f.fulfilled_quantity,
      })));

      toast.success(locale === 'ar' ? 'تم تطبيق اقتراح FIFO بناءً على تواريخ انتهاء الصلاحية' : 'FIFO suggestion applied based on expiry dates');
    } catch {
      toast.error(locale === 'ar' ? 'فشل جلب بيانات FIFO' : 'Failed to fetch FIFO data');
    } finally {
      setIsSuggestingFIFO(false);
    }
  };

  const isDocLocked = isDocumentLocked('KITCHEN_REQUEST', status);
  const isPending = updateStatus.isPending || fulfillRequest.isPending;

  const workflowActions = (
    <>
      <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="SUBMIT" role={user?.role}>
        <Button 
          disabled={isWriteBlocked}
          className="bg-primary hover:bg-primary/95 text-white rounded-2xl h-14 px-10 text-label-xs font-black uppercase tracking-widest transition-all shadow-2xl shadow-primary/30 border-none"
          onClick={handleSubmit}
        >
          <CheckCircle2 className="w-5 h-5 me-3" />
          {t('submit_request') || 'Submit Request'}
        </Button>
      </ActionGuard>
      <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="CANCEL" role={user?.role}>
        <Button 
          variant="outline" 
          disabled={isWriteBlocked}
          className="rounded-2xl border-red-500/30 text-red-500 hover:bg-red-500/5 h-14 px-8 text-label-xs font-black uppercase tracking-widest transition-all"
          onClick={() => setRejectDialogOpen(true)}
        >
          <XCircle className="w-5 h-5 me-3" />
          {t('cancel_request') || 'Cancel Request'}
        </Button>
      </ActionGuard>
      <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="APPROVE" role={user?.role}>
        <Button 
          disabled={isWriteBlocked}
          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-14 px-10 text-label-xs font-black uppercase tracking-widest transition-all shadow-2xl shadow-emerald-600/30 border-none"
          onClick={handleApprove}
        >
          <CheckCircle2 className="w-5 h-5 me-3" />
          {t('approve')}
        </Button>
      </ActionGuard>
      <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="FULFILL" role={user?.role}>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleSuggestFIFO}
            disabled={isWriteBlocked || isSuggestingFIFO}
            variant="outline"
            className="rounded-2xl border-amber-500/30 text-amber-500 hover:bg-amber-500/10 h-14 px-4 text-label-xxs font-black uppercase tracking-widest transition-all"
          >
            <Sparkles className={`w-4 h-4 ${isSuggestingFIFO ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            disabled={isWriteBlocked}
            className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl h-14 px-12 text-label-xs font-black uppercase tracking-widest transition-all shadow-2xl shadow-cyan-600/30 border-none"
            onClick={openFulfillDialog}
          >
            <PackageCheck className="w-5 h-5 me-3" />
            {t('fulfill')}
          </Button>
        </div>
      </ActionGuard>
    </>
  );

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col animate-in fade-in duration-1000 pb-32">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <Breadcrumb 
              items={[
                { label: tCommon('inventory'), href: '#' },
                { label: t('title'), href: "/kitchen-requests" },
                { label: request.request_number }
              ]} 
            />
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-lg">
                <ArrowLeft className={cn("w-5 h-5", locale === 'ar' && "rotate-180")} />
              </Button>
              <div>
                <h1 className="text-headline-lg font-semibold uppercase italic">{request.request_number}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <StatusBadge status={request.status} />
                  <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <ClientOnlyTime date={request.created_at} mode="date" locale={locale} className="tabular-nums" />
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
              <div className="lg:col-span-8 space-y-8">
                <div className="bg-surface-container-lowest p-5 px-6 rounded-lg border border-surface-container-high/20 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5" />
                      {t('department')}
                    </span>
                    <p className="text-body-md font-bold">{request.department_name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2">
                      <Warehouse className="w-3.5 h-3.5" />
                      {t('warehouse')}
                    </span>
                    <p className="text-body-md font-bold">{request.warehouse_name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      {t('requested_by')}
                    </span>
                    <p className="text-body-md font-bold">{request.requested_by}</p>
                  </div>
                  {request.notes && (
                    <div className="md:col-span-3 pt-4 border-t border-surface-container-high/50 space-y-1">
                      <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        {tCommon('notes')}
                      </span>
                      <p className="text-label-sm text-muted-foreground italic leading-relaxed">&quot;{request.notes}&quot;</p>
                    </div>
                  )}
                  {status !== KITCHEN_REQUEST_STATUS.DRAFT && request.rejection_reason && (
                    <div className="md:col-span-3 p-4 bg-red-500/5 border border-red-500/10 rounded-lg space-y-1">
                      <span className="text-label-xs font-semibold uppercase text-red-500/60 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {t('rejection_reason_label')}
                      </span>
                      <p className="text-label-sm font-bold text-red-500">{request.rejection_reason}</p>
                    </div>
                  )}
                </div>

                <div className="bg-surface-container-lowest rounded-lg border border-surface-container-high/20 overflow-hidden">
                  <div className="p-5 px-6 border-b border-surface-container-high/50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-1.5 h-6 bg-cyan-500 rounded-full" />
                      <h3 className="text-label-sm font-semibold uppercase">{t('items')}</h3>
                    </div>
                    <Badge variant="outline" className="rounded-lg text-label-xxs font-semibold px-3 py-1 border-none bg-surface-container-high text-muted-foreground/60">
                      {request.items.length} {t('entries')}
                    </Badge>
                  </div>
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
                  <span className="text-body-md font-semibold text-cyan-500 tabular-nums">
                    {line.qty}
                  </span>
                )}
                renderUom={(line) => (
                  <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">
                    {line.item.primary_uom?.code || '---'}
                  </span>
                )}
                extraColumns={extraColumns}
              />
            </div>
              </div>

              {/* Right Column: Timeline and Meta */}
              <div className="lg:col-span-4 space-y-8">
                <div className="bg-surface-container-lowest p-8 rounded-lg border border-surface-container-high/20 relative overflow-hidden group">
                  <div className="absolute top-0 end-0 w-32 h-32 bg-cyan-500/5 blur-[50px] -me-16 -mt-16 rounded-full group-hover:bg-cyan-500/10 transition-all duration-700" />
                  <div className="relative space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <History className="w-5 h-5 text-cyan-500" />
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

          <FormFooter 
            isLocked={isDocLocked && status !== KITCHEN_REQUEST_STATUS.SUBMITTED}
            onCancel={() => router.push('/kitchen-requests')}
            actions={workflowActions}
            isSaving={isPending}
          />
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
                <p className="text-label-sm font-bold">{item.item_name}</p>
                <p className="text-label-xxs font-semibold text-muted-foreground/40 uppercase">{t('requested')}: {item.quantity} {item.uom}</p>
              </div>
              <div className="text-center">
                <span className="text-label-xxs font-semibold text-muted-foreground/60 uppercase mb-2 block">{t('fulfilling')}</span>
                <Input 
                  type="number"
                  step="0.01"
                  dir="ltr"
                  disabled={isWriteBlocked}
                  aria-label={t('fulfilling') + " " + item.item_name}
                  className="bg-surface-container-highest/50 border-none h-11 text-center font-semibold text-body-md rounded-xl transition-all focus:ring-1 focus:ring-operational-cyan/30"
                  value={fulfillmentData.find(f => f.item_id === item.item_id)?.fulfilled_quantity || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFulfillmentData(prev => prev.map(f => f.item_id === item.item_id ? { ...f, fulfilled_quantity: val } : f));
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
