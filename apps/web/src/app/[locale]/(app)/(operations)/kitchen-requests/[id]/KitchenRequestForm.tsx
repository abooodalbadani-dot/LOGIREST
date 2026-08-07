'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
  AlertCircle,
  Trash2,
  Save,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatusTimeline, type StatusTimelineEntry } from '@/components/shared/StatusTimeline';
import {
  useUpdateKitchenRequestStatus,
  useFulfillKitchenRequest,
  useUpdateKitchenRequest
} from '@/features/operations/hooks/useKitchenRequests';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { useItems } from '@/features/items/hooks/useItems';
import {
  KitchenRequestDetail,
  KitchenRequestItem
} from '@/features/operations/types/kitchen-request';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Status } from '@/components/shared/StatusTimeline';
import { useAuth } from '@/providers/AuthProvider';
import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import {
  canPerformActionV2,
  isDocumentLocked,
  DocumentStatus
} from '@logirest/shared-types';
import { resolveUomCode, getAvailableUomsForItem } from '@/utils/uom-helper';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { KITCHEN_REQUEST_STATUS } from '@logirest/shared-types';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { LockBanner } from '@/components/shared/LockBanner';
import { audioAlerts } from '@/utils/audio';
import { toast } from 'sonner';
import { DocumentLineItemTable, getItemImage, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';

interface QuantityInputProps {
  value: number | string;
  onChange: (val: number | '') => void;
  disabled?: boolean;
  className?: string;
}

function QuantityInput({ value, onChange, disabled, className }: QuantityInputProps) {
  const [localValue, setLocalValue] = useState(value !== undefined && value !== null ? String(value) : '');

  useEffect(() => {
    setLocalValue(value !== undefined && value !== null ? String(value) : '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '' || /^\d*\.?\d*$/.test(rawVal)) {
      setLocalValue(rawVal);
      if (rawVal === '' || rawVal === '.') {
        onChange('');
      } else {
        const parsed = parseFloat(rawVal);
        onChange(isNaN(parsed) ? '' : parsed);
      }
    }
  };

  const handleBlur = () => {
    let finalVal = 1;
    if (localValue === '' || localValue === '.') {
      finalVal = 1;
    } else {
      const parsed = parseFloat(localValue);
      if (isNaN(parsed) || parsed <= 0) {
        finalVal = 1;
      } else {
        finalVal = parsed;
      }
    }
    setLocalValue(String(finalVal));
    onChange(finalVal);
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={localValue}
      disabled={disabled}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      dir="ltr"
    />
  );
}

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
  const status = request.status as DocumentStatus;
  const normStatus = String(request.status || '').toUpperCase();
  const isDraft = normStatus === 'DRAFT' && canPerformActionV2('KITCHEN_REQUEST', status, 'SUBMIT', user?.role);
  const isFulfilled = normStatus === 'FULFILLED' || normStatus === 'EXECUTED' || normStatus === 'POSTED' || !!request.issueId || !!request.issueDocument;

  const updateStatus = useUpdateKitchenRequestStatus();
  const updateDraft = useUpdateKitchenRequest();
  const fulfillRequest = useFulfillKitchenRequest();

  const { data: departmentsData } = useDepartments();
  const { data: warehousesData } = useWarehouses();
  const { data: allItemsData } = useItems();
  const departments = departmentsData?.data || [];
  const warehouses = warehousesData?.data || [];
  const allItems = allItemsData?.data || [];

  // Editable form state for Drafts
  const [departmentId, setDepartmentId] = useState(request.departmentId || '');
  const [warehouseId, setWarehouseId] = useState(request.warehouseId || '');
  const [notes, setNotes] = useState(request.notes || '');

  const initialTableLines = useMemo((): KitchenRequestLineItem[] => {
    return request.items.map((item) => {
      const rawBarcode = item.barcode || item.itemBarcode || item.itemCode;
      const displayBarcode = (rawBarcode && rawBarcode !== 'N/A') ? rawBarcode : '—';
      const matchedItem = allItems.find((i) => i.id === item.itemId || i.code === item.itemCode || i.code === item.barcode) as (typeof allItems[0] & { unitOfMeasure?: { id?: string } }) | undefined;
      const effectiveUomId = item.uomId || matchedItem?.unitOfMeasure?.id || matchedItem?.primaryUom?.id || '';
      return {
        id: item.id,
        item: {
          id: item.itemId,
          code: displayBarcode,
          barcode: displayBarcode,
          nameEn: item.itemName,
          nameAr: item.itemName,
          primaryUom: { id: effectiveUomId, code: item.uom },
          unitOfMeasure: matchedItem?.unitOfMeasure || null,
          uomConversions: item.uomConversions || (matchedItem as { uomConversions?: unknown[] })?.uomConversions || [],
          image: item.itemImage || item.image || null
        },
        qty: item.quantity,
        fulfilledQty: item.fulfilledQuantity ?? 0,
        uomId: effectiveUomId,
        lot: null,
        notes: item.notes ?? null,
      };
    });
  }, [request.items, allItems]);

  const [lines, setLines] = useState<KitchenRequestLineItem[]>(initialTableLines);

  // Full reset only when navigating to a different document.
  // Do NOT depend on request.version — that would overwrite user edits after every save.
  useEffect(() => {
    setLines(initialTableLines);
    setDepartmentId(request.departmentId || '');
    setWarehouseId(request.warehouseId || '');
    setNotes(request.notes || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id]);

  // After a save the backend deletes + recreates items, so server-side IDs change.
  // Sync ONLY the id fields (so subsequent findIndex calls stay valid) while
  // preserving every user edit (uomId, qty, notes).
  const lastSyncedVersionRef = useRef(request.version);
  useEffect(() => {
    if (lastSyncedVersionRef.current === request.version) return;
    lastSyncedVersionRef.current = request.version;
    setLines(prev =>
      prev.map((line, idx) => {
        const serverItem = request.items[idx];
        if (!serverItem) return line;
        // Preserve every user-edited field; only refresh the server-assigned id.
        return { ...line, id: serverItem.id };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id, request.version]);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false);
  const [fulfillmentData, setFulfillmentData] = useState<{ itemId: string; fulfilledQty: number }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: warehouseLockState } = useWarehouseLock((isDraft ? warehouseId : request.warehouseId) || null);
  const isWriteBlocked = isSubmitting || updateStatus.isPending || updateDraft.isPending || fulfillRequest.isPending || fulfillRequest.isSuccess || !!warehouseLockState?.isLocked;

  const showFulfilled = useMemo(() => {
    return canPerformActionV2('KITCHEN_REQUEST', status, 'INTERNAL_MOVEMENT', user?.role);
  }, [status, user?.role]);

  // Line editing handlers
  const handleQtyChange = (target: number | string, val: number | '') => {
    setLines(prev => prev.map((l, i) => {
      const match = typeof target === 'number' ? i === target : (l.id === target || l.item.id === target);
      return match ? { ...l, qty: typeof val === 'number' ? val : 0 } : l;
    }));
  };

  const handleUomChange = (target: number | string, uomId: string) => {
    setLines(prev => prev.map((l, i) => {
      const match = typeof target === 'number' ? i === target : (l.id === target || l.item.id === target);
      return match ? { ...l, uomId } : l;
    }));
  };

  const handleNotesChange = (target: number | string, lineNotes: string) => {
    setLines(prev => prev.map((l, i) => {
      const match = typeof target === 'number' ? i === target : (l.id === target || l.item.id === target);
      return match ? { ...l, notes: lineNotes } : l;
    }));
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      toast.error(locale === 'ar' ? 'يجب أن يحتوي الطلب على صنف واحد على الأقل' : 'Request must contain at least one item');
      return;
    }
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSubmitting || isWriteBlocked) return;
    if (warehouseLockState?.isLocked) {
      audioAlerts.playScanBlocked();
      toast.error(t('warehouse_locked_cannot_mutate') || 'Warehouse is locked. Cannot perform this action.');
      return;
    }
    if (lines.length === 0) {
      toast.error(locale === 'ar' ? 'يجب إضافة صنف واحد على الأقل' : 'Please add at least one item');
      return;
    }
    if (lines.some(l => l.qty <= 0)) {
      toast.error(locale === 'ar' ? 'يجب أن تكون الكمية أكبر من الصفر لجميع الأصناف' : 'All quantities must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDraft.mutateAsync({
        id,
        version: request.version ?? 0,
        data: {
          departmentId,
          warehouseId,
          notes,
          items: lines.map(l => ({
            itemId: l.item.id,
            quantity: l.qty ?? 1,
            uomId: l.uomId || undefined,
            notes: l.notes || undefined,
          })),
        },
      });

      toast.success(locale === 'ar' ? 'تم حفظ المسودة بنجاح' : 'Draft saved successfully');
    } catch (err) {
      console.error('Failed to save draft', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDraft = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSubmitting || isWriteBlocked) return;
    if (warehouseLockState?.isLocked) {
      audioAlerts.playScanBlocked();
      toast.error(t('warehouse_locked_cannot_mutate') || 'Warehouse is locked. Cannot perform this action.');
      return;
    }
    if (!departmentId || !warehouseId) {
      toast.error(locale === 'ar' ? 'يرجى اختيار القسم والمستودع' : 'Please select department and warehouse');
      return;
    }
    if (lines.length === 0) {
      toast.error(locale === 'ar' ? 'يجب إضافة صنف واحد على الأقل' : 'Please add at least one item');
      return;
    }
    if (lines.some(l => l.qty <= 0)) {
      toast.error(locale === 'ar' ? 'يجب أن تكون الكمية أكبر من الصفر لجميع الأصناف' : 'All quantities must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await updateDraft.mutateAsync({
        id,
        version: request.version ?? 0,
        data: {
          departmentId,
          warehouseId,
          notes,
          items: lines.map(l => ({
            itemId: l.item.id,
            quantity: l.qty,
            uomId: l.uomId || undefined,
            notes: l.notes || undefined,
          })),
        },
      });

      await updateStatus.mutateAsync({
        id,
        status: KITCHEN_REQUEST_STATUS.SUBMITTED,
        version: updated.version ?? ((request.version ?? 0) + 1),
        headers: { 'X-Idempotency-Key': crypto.randomUUID() },
      });
      toast.success(locale === 'ar' ? 'تم تقديم الطلب بنجاح' : 'Request submitted successfully');
    } catch (err) {
      console.error('Failed to submit request', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const extraColumns = useMemo(() => {
    if (isDraft) {
      return [
        {
          header: tCommon('notes') || 'Notes',
          cell: (line: KitchenRequestLineItem) => {
            const index = lines.findIndex(l => l.id === line.id);
            return (
              <Input
                value={line.notes || ''}
                onChange={(e) => handleNotesChange(index, e.target.value)}
                disabled={isWriteBlocked}
                placeholder={tCommon('notes') || 'Notes'}
                className="h-9 bg-background border border-border text-foreground rounded-lg text-sm"
              />
            );
          }
        },
        {
          header: '',
          className: 'w-12 text-center',
          cell: (_: KitchenRequestLineItem) => {
            const index = lines.findIndex(l => l.id === _.id);
            return (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isWriteBlocked || lines.length <= 1}
                onClick={() => handleRemoveLine(index)}
                className="h-9 w-9 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            );
          }
        }
      ];
    }

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
        <p className="text-label-xs font-medium text-muted-foreground max-w-[200px] line-clamp-2 italic">
          {line.notes || '—'}
        </p>
      )
    });
    return cols;
  }, [isDraft, showFulfilled, t, tCommon, lines, isWriteBlocked]);

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
      toast.success(locale === 'ar' ? 'تمت الموافقة على الطلب بنجاح' : 'Request approved successfully');
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
      toast.success(locale === 'ar' ? 'تم إلغاء الطلب بنجاح' : 'Request cancelled successfully');
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

  const workflowActions = isDraft ? (
    <>
      {/* Mobile Footer Stack */}
      <div className="flex flex-col gap-3 w-full md:hidden mt-6 pb-6">
        <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="SUBMIT" role={user?.role}>
          <Button
            type="button"
            className="w-full h-12 rounded-xl font-bold bg-brand-gold hover:bg-brand-gold/90 text-[#0B1220] shadow-md transition-all active:scale-[0.98]"
            size="lg"
            disabled={isWriteBlocked}
            onClick={handleSubmitDraft}
          >
            <Send className="w-4 h-4 me-2" />
            {t('submit_request') || 'SUBMIT REQUEST'}
          </Button>
        </ActionGuard>
        <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="SUBMIT" role={user?.role}>
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl font-bold border-border bg-background hover:bg-surface-container text-foreground transition-all active:scale-[0.98]"
            disabled={isWriteBlocked}
            onClick={handleSaveDraft}
          >
            <Save className="w-4 h-4 me-2" />
            {t('save_draft') || 'SAVE DRAFT'}
          </Button>
        </ActionGuard>
      </div>

      {/* Desktop Footer Row */}
      <div className="hidden md:flex justify-end items-center gap-3 w-full mt-6 pt-4 border-t border-border/20">
        <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="SUBMIT" role={user?.role}>
          <Button
            type="button"
            variant="outline"
            disabled={isWriteBlocked}
            className="h-11 px-6 rounded-xl border border-border bg-background hover:bg-surface-container font-bold text-foreground transition-all"
            onClick={handleSaveDraft}
          >
            <Save className="w-4 h-4 me-2" />
            {t('save_draft') || 'Save Draft'}
          </Button>
        </ActionGuard>
        <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="SUBMIT" role={user?.role}>
          <Button
            type="button"
            disabled={isWriteBlocked}
            className="h-11 px-6 bg-brand-gold hover:bg-brand-gold/90 text-[#0B1220] font-bold rounded-xl shadow-md shadow-brand-gold/20 flex items-center justify-center gap-2 transition-all active:scale-95 border-none"
            onClick={handleSubmitDraft}
          >
            <Send className="w-4 h-4 me-2" />
            {t('submit_request') || 'Submit Request'}
          </Button>
        </ActionGuard>
      </div>
    </>
  ) : (
    <div className="flex flex-col md:flex-row md:justify-end items-center gap-3 w-full mt-6 pt-4 border-t border-border/20 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="CANCEL" role={user?.role}>
        <Button
          type="button"
          variant="outline"
          disabled={isWriteBlocked}
          className="w-full md:w-auto h-11 px-5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive font-bold transition-all text-center flex items-center justify-center gap-2 order-2 md:order-1"
          onClick={() => setRejectDialogOpen(true)}
        >
          {t('cancel_request') || 'Cancel Request'}
        </Button>
      </ActionGuard>

      <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="APPROVE" role={user?.role}>
        <Button
          disabled={isWriteBlocked}
          className="w-full md:w-auto h-11 px-6 bg-status-success hover:bg-status-success/90 text-white font-bold rounded-xl shadow-md shadow-status-success/20 flex items-center justify-center gap-2 transition-all active:scale-95 border-none order-1 md:order-2"
          onClick={handleApprove}
        >
          <CheckCircle2 className="w-5 h-5" />
          {t('approve')}
        </Button>
      </ActionGuard>

      <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="SUBMIT" role={user?.role}>
        <Button
          disabled={isWriteBlocked}
          className="w-full md:w-auto h-11 px-6 bg-brand-gold hover:bg-brand-gold/90 text-[#0B1220] font-bold rounded-xl shadow-md shadow-brand-gold/20 flex items-center justify-center gap-2 transition-all active:scale-95 border-none order-1 md:order-2"
          onClick={handleSubmit}
        >
          <CheckCircle2 className="w-5 h-5" />
          {t('submit_request') || 'Submit Request'}
        </Button>
      </ActionGuard>

      <ActionGuard documentType="KITCHEN_REQUEST" status={status} action="FULFILL" role={user?.role}>
        <Button
          disabled={isWriteBlocked}
          className="w-full md:w-auto h-11 px-6 bg-brand-gold hover:bg-brand-gold/90 text-[#0B1220] font-bold rounded-xl shadow-md shadow-brand-gold/20 flex items-center justify-center gap-2 transition-all active:scale-95 border-none order-1 md:order-2"
          onClick={openFulfillDialog}
        >
          <PackageCheck className="w-5 h-5" />
          {t('fulfill')}
        </Button>
      </ActionGuard>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col animate-in fade-in duration-200 pb-32">
      <div className="max-w-auto mx-auto px-6 lg:px-10 py-10 w-full space-y-8">
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
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <StatusBadge status={request.status} />
                  {isFulfilled && (
                    <Link
                      href={`/issues/${request.issueDocument?.id || request.issueId || id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-operational-cyan/10 border border-operational-cyan/30 text-operational-cyan hover:bg-operational-cyan/20 text-label-xs font-mono font-bold transition-all shadow-sm"
                      title={locale === 'ar' ? 'الانتقال إلى سند الصرف' : 'Go to Issue Document'}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {request.issueDocument?.issueNumber || (request.issueId ? `ISS-${request.issueId.slice(0, 8).toUpperCase()}` : `ISS-2026-HQ-${request.requestNumber.split('-').pop() || '00035'}`)}
                    </Link>
                  )}
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

          <DocumentLockWrapper isLocked={isDocLocked && status !== 'SUBMITTED'}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Details and Items */}
              <div className="lg:col-span-8 space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-100">

                {/* Metadata Card */}
                <div className="bg-card backdrop-blur-xl shadow-lg hover:shadow-xl p-4 sm:p-6 px-5 sm:px-7 rounded-2xl sm:rounded-3xl border border-border/30 relative overflow-hidden group transition-all duration-300">

                  {isDraft ? (
                    /* Interactive Inputs for Draft State */
                    <div className="space-y-4 relative z-10">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Department Dropdown */}
                        <div className="space-y-1.5 min-w-0">
                          <label className="text-label-sm font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 mb-1">
                            <div className="p-1 rounded-md bg-surface-container-high dark:bg-surface-lowest shadow-sm border border-border/40 shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-operational-cyan" />
                            </div>
                            <span className="truncate">{t('department')}</span>
                          </label>
                          {(() => {
                            const selectedDept = departments.find((d) => d.id === departmentId);
                            const selectedDeptName = selectedDept?.name || selectedDept?.code || request.departmentName || undefined;
                            return (
                              <Select value={departmentId} onValueChange={(val) => setDepartmentId(val ?? '')} disabled={isWriteBlocked}>
                                <SelectTrigger className="h-11 bg-background border border-border text-foreground font-medium rounded-xl focus:ring-1 focus:ring-operational-cyan/30">
                                  <SelectValue placeholder={t('select_department') || 'Select Department'}>
                                    {selectedDeptName}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      {dept.name || dept.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          })()}
                        </div>

                        {/* Warehouse Dropdown */}
                        <div className="space-y-1.5 min-w-0">
                          <label className="text-label-sm font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 mb-1">
                            <div className="p-1 rounded-md bg-surface-container-high dark:bg-surface-lowest shadow-sm border border-border/40 shrink-0">
                              <Warehouse className="w-3.5 h-3.5 text-operational-cyan" />
                            </div>
                            <span className="truncate">{t('warehouse')}</span>
                          </label>
                          {(() => {
                            const selectedWh = warehouses.find((w) => w.id === warehouseId);
                            const selectedWhName = selectedWh?.name || selectedWh?.code || request.warehouseName || undefined;
                            return (
                              <Select value={warehouseId} onValueChange={(val) => setWarehouseId(val ?? '')} disabled={isWriteBlocked}>
                                <SelectTrigger className="h-11 bg-background border border-border text-foreground font-medium rounded-xl focus:ring-1 focus:ring-operational-cyan/30">
                                  <SelectValue placeholder={t('select_warehouse') || 'Select Warehouse'}>
                                    {selectedWhName}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {warehouses.map((wh) => (
                                    <SelectItem key={wh.id} value={wh.id}>
                                      {wh.name || wh.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Notes Field (Full width) */}
                      <div className="pt-4 mt-4 border-t border-border/30 space-y-1.5">
                        <label className="text-label-sm font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 mb-1">
                          <FileText className="w-3.5 h-3.5 text-operational-cyan" />
                          {tCommon('notes')}
                        </label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder={t('notes_placeholder') || 'Enter notes...'}
                          disabled={isWriteBlocked}
                          className="bg-background border border-border rounded-xl p-3 text-body-md font-medium text-foreground min-h-[80px] resize-none focus:ring-1 focus:ring-operational-cyan/30"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Read-Only Display for Other States */
                    <>
                      <div className={cn(
                        "grid grid-cols-2 gap-4 relative z-10",
                        isFulfilled ? "md:grid-cols-4 md:gap-6" : "md:grid-cols-3 md:gap-6"
                      )}>
                        <div className="space-y-1.5 min-w-0">
                          <span className="text-label-sm font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5 mb-1">
                            <div className="p-1 rounded-md bg-surface-container-high dark:bg-surface-lowest shadow-sm border border-border/40 shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-operational-cyan" />
                            </div>
                            <span className="truncate">{t('department')}</span>
                          </span>
                          <p className="text-body-md font-bold tracking-tight text-foreground/90 truncate">{request.departmentName}</p>
                        </div>

                        <div className="space-y-1.5 min-w-0">
                          <span className="text-label-sm font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5 mb-1">
                            <div className="p-1 rounded-md bg-surface-container-high dark:bg-surface-lowest shadow-sm border border-border/40 shrink-0">
                              <Warehouse className="w-3.5 h-3.5 text-operational-cyan" />
                            </div>
                            <span className="truncate">{t('warehouse')}</span>
                          </span>
                          <p className="text-body-md font-bold tracking-tight text-foreground/90 truncate">{request.warehouseName}</p>
                        </div>

                        <div className="space-y-1.5 min-w-0">
                          <span className="text-label-sm font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5 mb-1">
                            <div className="p-1 rounded-md bg-surface-container-high dark:bg-surface-lowest shadow-sm border border-border/40 shrink-0">
                              <User className="w-3.5 h-3.5 text-operational-cyan" />
                            </div>
                            <span className="truncate">{t('requested_by')}</span>
                          </span>
                          <p className="text-body-md font-bold tracking-tight text-foreground/90 truncate">{request.requestedBy}</p>
                        </div>

                        {isFulfilled && (
                          <div className="space-y-1.5 min-w-0">
                            <span className="text-label-sm font-bold uppercase tracking-wider text-operational-cyan/90 flex items-center gap-1.5 mb-1">
                              <div className="p-1 rounded-md bg-operational-cyan/10 shadow-sm border border-operational-cyan/20 shrink-0">
                                <FileText className="w-3.5 h-3.5 text-operational-cyan" />
                              </div>
                              <span className="truncate">{locale === 'ar' ? 'سند الصرف المرتبط' : 'Related Issue Document'}</span>
                            </span>
                            <p className="text-body-md font-bold tracking-tight truncate">
                              <Link
                                href={`/issues/${request.issueDocument?.id || request.issueId || id}`}
                                className="inline-flex items-center gap-1.5 text-operational-cyan hover:text-operational-cyan/80 hover:underline font-mono text-sm transition-all truncate"
                              >
                                {request.issueDocument?.issueNumber || (request.issueId ? `ISS-${request.issueId.slice(0, 8).toUpperCase()}` : `ISS-2026-HQ-${request.requestNumber.split('-').pop() || '00035'}`)}
                              </Link>
                            </p>
                          </div>
                        )}
                      </div>

                      {request.notes && (
                        <div className="pt-4 mt-4 border-t border-border/30 relative z-10">
                          <div className="flex flex-col gap-1.5 p-3 sm:p-4 bg-surface-container-lowest rounded-xl">
                            <span className="text-label-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              {tCommon('notes')}
                            </span>
                            <span className="text-body-md text-foreground font-medium leading-relaxed">
                              &quot;{request.notes}&quot;
                            </span>
                          </div>
                        </div>
                      )}

                      {request.rejectionReason && (
                        <div className="mt-4 p-4 bg-status-error/5 border border-status-error/15 rounded-xl space-y-1.5 relative z-10 transition-all hover:bg-status-error/10 hover:border-status-error/30">
                          <span className="text-label-sm font-bold uppercase tracking-wider text-status-error/90 flex items-center gap-1.5 mb-1">
                            <AlertCircle className="w-4 h-4 text-status-error animate-pulse shrink-0" />
                            {t('rejection_reason_label')}
                          </span>
                          <p className="text-body-md font-bold text-status-error/90">{request.rejectionReason}</p>
                        </div>
                      )}
                    </>
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
                      {lines.length} {t('entries')}
                    </Badge>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <DocumentLineItemTable
                      lines={lines}
                      locale={locale}
                      isReadOnly={!isDraft}
                      hideLotColumns={true}
                      headers={{
                        code: tCommon('table_headers.code'),
                        name: tCommon('table_headers.name'),
                        qty: tCommon('table_headers.qty'),
                        uom: tCommon('table_headers.uom'),
                      }}
                      renderQty={(line: KitchenRequestLineItem) => {
                        if (isDraft) {
                          const index = lines.findIndex(l => l.id === line.id);
                          return (
                            <div className="flex justify-center items-center">
                              <QuantityInput
                                value={line.qty}
                                onChange={(val) => handleQtyChange(index, val)}
                                disabled={isWriteBlocked}
                                className="h-9 w-24 max-w-[100px] text-center font-black text-lg bg-background border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary rounded-lg outline-none transition-all mx-auto force-latin-numbers"
                              />
                            </div>
                          );
                        }
                        return (
                          <span className="text-body-md font-semibold text-foreground tabular-nums">
                            {line.qty}
                          </span>
                        );
                      }}
                      renderUom={(line: KitchenRequestLineItem) => {
                        const fullItem = allItems.find((i) => i.id === line.item.id || i.code === line.item.code) || line.item;
                        if (isDraft) {
                          const index = lines.findIndex(l => l.id === line.id);
                          const uomOpts = getAvailableUomsForItem(fullItem);
                          const selectedUom = uomOpts.find(u => u.id === line.uomId);
                          const displayUom = selectedUom?.code || selectedUom?.name || resolveUomCode(line.uomId, fullItem, null, 'PCS');
                          return (
                            <Select
                              value={line.uomId}
                              onValueChange={(val) => handleUomChange(index !== -1 ? index : line.id, val ?? '')}
                              disabled={isWriteBlocked}
                            >
                              <SelectTrigger className="h-9 min-w-[120px] bg-background border border-border text-foreground font-semibold rounded-lg">
                                <SelectValue placeholder="UOM">
                                  {displayUom}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {uomOpts.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.code || u.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        }
                        return (
                          <span className="text-label-xs font-semibold uppercase text-foreground font-mono">
                            {resolveUomCode(line.uomId, fullItem, null, 'PCS')}
                          </span>
                        );
                      }}
                      extraColumns={extraColumns}
                    />
                  </div>

                  {/* Mobile Cards View */}
                  <div className="flex flex-col gap-3 md:hidden p-3">
                    {lines.map((line, idx) => {
                      const fullItem = allItems.find((i) => i.id === line.item.id || i.code === line.item.code) || line.item;
                      const imgSrc = getItemImage(line.item);
                      const itemName = locale === 'ar'
                        ? (line.item.nameAr || line.item.nameEn)
                        : (line.item.nameEn || line.item.nameAr);
                      const barcodeText = line.item.code || '—';
                      const uomOpts = getAvailableUomsForItem(fullItem);
                      const selectedUom = uomOpts.find(u => u.id === line.uomId);
                      const displayUom = selectedUom?.code || selectedUom?.name || resolveUomCode(line.uomId, fullItem, null, 'PCS');

                      if (isDraft) {
                        return (
                          <div
                            key={line.id || idx}
                            className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden"
                          >
                            {/* Row 1: Image, Name, Barcode, Trash */}
                            <div className="flex items-center justify-between gap-3 min-w-0">
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

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={isWriteBlocked || lines.length <= 1}
                                onClick={() => handleRemoveLine(idx)}
                                className="h-9 w-9 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-xl shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Row 2: QTY & UOM side-by-side */}
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/30">
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                                  {tCommon('table_headers.qty') || 'Quantity'}
                                </label>
                                <QuantityInput
                                  value={line.qty}
                                  onChange={(val) => handleQtyChange(idx, val)}
                                  disabled={isWriteBlocked}
                                  className="h-10 w-full text-center font-black bg-background border border-border text-foreground rounded-xl force-latin-numbers"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                                  {tCommon('table_headers.uom') || 'UOM'}
                                </label>
                                <Select
                                  value={line.uomId}
                                  onValueChange={(val) => handleUomChange(idx, val ?? '')}
                                  disabled={isWriteBlocked}
                                >
                                  <SelectTrigger className="h-10 w-full bg-background border border-border text-foreground font-semibold rounded-xl">
                                    <SelectValue placeholder="UOM">
                                      {displayUom}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {uomOpts.map((u) => (
                                      <SelectItem key={u.id} value={u.id}>
                                        {u.code || u.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Row 3: Line Notes */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                                {tCommon('notes') || 'Notes'}
                              </label>
                              <Input
                                value={line.notes || ''}
                                onChange={(e) => handleNotesChange(idx, e.target.value)}
                                disabled={isWriteBlocked}
                                placeholder={tCommon('notes') || 'Add line notes...'}
                                className="h-10 bg-background border border-border text-foreground rounded-xl text-xs"
                              />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={line.id || idx}
                          className="bg-surface-lowest/80 dark:bg-surface-container/80 backdrop-blur-md border border-border/40 rounded-2xl p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden transition-all group hover:shadow-md"
                        >
                          <div className="absolute top-0 end-0 w-24 h-24 bg-operational-cyan/5 rounded-full blur-2xl -z-10 group-hover:bg-operational-cyan/10 transition-colors duration-500" />

                          {/* Row 1: Product Image & Name / Barcode | Quantity & UOM */}
                          <div className="flex items-center justify-between gap-4 min-w-0">
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

                            <div className="flex flex-col items-end shrink-0 bg-operational-cyan/10 dark:bg-operational-cyan/5 p-2 px-3 rounded-xl border border-operational-cyan/20 text-end shadow-sm">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-sm font-black text-operational-cyan tabular-nums">{line.qty}</span>
                                <span className="text-xs font-bold text-foreground uppercase">{displayUom}</span>
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
                            <span className="font-bold text-xs text-muted-foreground uppercase tracking-wider shrink-0">
                              {tCommon('notes') || 'Notes'}:
                            </span>
                            <span className={cn(
                              "truncate text-xs font-medium",
                              line.notes ? "text-foreground italic" : "text-muted-foreground"
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
                <p className="text-label-xxs font-semibold text-muted-foreground uppercase">{t('requested')}: {item.quantity} {item.uom}</p>
              </div>
              <div className="text-center">
                <span className="text-label-xs font-semibold text-muted-foreground uppercase mb-2 block">{t('fulfilling')}</span>
                <Input
                  type="number"
                  step="0.01"
                  dir="ltr"
                  disabled={isWriteBlocked}
                  aria-label={t('fulfilling') + " " + item.itemName}
                  className="border border-border bg-background rounded-md text-center h-10 text-foreground font-semibold text-body-md transition-all focus:ring-1 focus:ring-operational-cyan/30 w-full"
                  value={fulfillmentData.find(f => f.itemId === item.itemId)?.fulfilledQty || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFulfillmentData(prev => prev.map(f => f.itemId === item.itemId ? { ...f, fulfilledQty: val } : f));
                  }}
                />
              </div>
              <div className="text-center pt-5">
                <span className="text-xs font-bold uppercase text-foreground">{item.uom}</span>
              </div>
            </div>
          ))}
        </div>
      </PostConfirmDialog>
    </div>
  );
}
