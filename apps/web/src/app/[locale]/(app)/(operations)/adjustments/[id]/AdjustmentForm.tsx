'use client';

import { Input } from '@/components/ui/input';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { StickyGlassHeader } from '@/components/shared/StickyGlassHeader';
import { InlineLoader } from '@/components/shared/InlineLoader';
import { useCreateAdjustment } from '@/features/operations/hooks/useCreateAdjustment';
import { useApproveAdjustment } from '@/features/operations/hooks/useApproveAdjustment';
import { usePostAdjustment } from '@/features/operations/hooks/usePostAdjustment';
import { useSubmitAdjustment } from '@/features/operations/hooks/useSubmitAdjustment';
import { useRejectAdjustment } from '@/features/operations/hooks/useRejectAdjustment';
import { useUpdateAdjustment } from '@/features/operations/hooks/useUpdateAdjustment';
import { useCancelAdjustment } from '@/features/operations/hooks/useCancelAdjustment';
import { useEditAdjustment } from '@/features/operations/hooks/useEditAdjustment';
import { useAuth } from '@/providers/AuthProvider';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { useAbortController } from '@/hooks/useAbortController';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { 
 CheckCircle, 
 Package, 
 Send,
 XCircle, 
 History,
 Info,
 Clock,
 AlertCircle,
 Pencil,
 X as XIcon,
 XCircle as XCircleIcon,
 CheckCircle as CheckCircleIcon
} from 'lucide-react';
import { AlertCircle as AlertCircleIcon, History as HistoryIcon, Package as PackageIcon, Send as SendIcon, CheckCircle as CheckCircleCircle, Clock as ClockIcon, Save, FileText, ArrowLeft, Scan, Trash2, Loader2 } from 'lucide-react';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import type { LotAllocation } from '@/types/documents';
import { useLotsByItem } from '@/features/operations/hooks/useLotsByItem';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { useItems } from '@/features/items/hooks/useItems';
import { useVarianceReasons } from '@/features/operations/api/useVarianceReasons';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentExportMenu } from '@/components/shared/DocumentExportMenu';
import { ADJUSTMENT_STATUS, type DocumentStatus } from '@logirest/shared-types';
import { type AdjustmentLine, type AdjustmentDetail } from '@/features/operations/hooks/useAdjustment';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import { FormFooter } from '@/components/layouts/FormLayout';
import { formatQuantity, formatDate } from '@/utils/currency';
import { audioAlerts } from '@/utils/audio';
import { VoidButton } from '@/components/shared/VoidButton';
import { PermissionGate } from '@/components/shared/PermissionGate';

interface AdjustmentFormProps {
 document?: AdjustmentDetail;
 id: string;
 isLocked: boolean;
 onConflict?: () => void;
}

function UnitCostInput({
  value,
  onChange,
  disabled,
  placeholder,
  className
}: {
  value: number | null | undefined;
  onChange: (val: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState<string>(value !== null && value !== undefined ? String(value) : '');

  useEffect(() => {
    const numVal = value !== null && value !== undefined ? Number(value) : null;
    const localNum = localValue !== '' ? Number(localValue) : null;
    if (numVal !== localNum) {
      setLocalValue(value !== null && value !== undefined ? String(value) : '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '' || /^\d*\.?\d*$/.test(rawVal)) {
      setLocalValue(rawVal);
      if (rawVal === '' || rawVal === '.') {
        onChange(null);
      } else {
        const parsed = parseFloat(rawVal);
        onChange(isNaN(parsed) ? null : parsed);
      }
    }
  };

  const handleBlur = () => {
    if (localValue === '' || localValue === '.') {
      setLocalValue('0');
      onChange(0);
    } else {
      const parsed = parseFloat(localValue);
      if (isNaN(parsed)) {
        setLocalValue('0');
        onChange(0);
      } else {
        setLocalValue(String(parsed));
        onChange(parsed);
      }
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={localValue}
      lang="en"
      dir="ltr"
      style={{ direction: 'ltr' }}
      disabled={disabled}
      placeholder={placeholder}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
}

function AdjustmentLotSelector({ 
  itemId, 
  warehouseId, 
  value, 
  onChange, 
  disabled 
}: { 
  itemId: string; 
  warehouseId: string; 
  value?: string; 
  onChange: (lotId: string, lotNumber: string, expiryDate?: string) => void;
  disabled: boolean;
}) {
  const { data: lots } = useLotsByItem({ itemId, warehouseId });
  const items = useMemo(() => {
    return (lots || []).map(lot => ({
      id: lot.id,
      name: lot.lotNumber + (lot.isExpired ? ` (Expired)` : ''),
      code: lot.lotNumber,
    }));
  }, [lots]);

  return (
    <div className="flex items-center justify-center w-full" dir="ltr">
      <SmartCombobox
        items={items}
        value={value || ''}
        disabled={disabled}
        onSelect={(item) => {
          const selected = lots?.find(l => l.id === item.id);
          if (selected) {
            onChange(selected.id, selected.lotNumber, selected.expiryDate || undefined);
          }
        }}
        placeholder={"Select Lot"}
        triggerClassName="w-32 md:w-40 h-7 rounded-sm border border-gray-600 bg-transparent text-center px-2 py-0.5 font-mono text-xs outline-none transition-all disabled:opacity-50 text-white focus:ring-1 focus:ring-primary shadow-none"
      />
    </div>
  );
}

interface AdjustmentFormLine extends Omit<AdjustmentLine, 'lot' | 'lotAllocations'> {
 qty: number;
 lot?: { lotNumber: string; expiryDate: string | null } | null;
 lotAllocations?: LotAllocation[];
}

export function AdjustmentForm({ 
  document, 
 id, 
 isLocked,
 onConflict
}: AdjustmentFormProps) {
 const t = useTranslations('operations.adjustment');
 const tc = useTranslations('common');
 const tp = useTranslations('print');
 const locale = useLocale();
 const router = useRouter();
 const { user } = useAuth();
 
 const isNew = id === 'new';
 const adjustmentStatus = (document?.status as DocumentStatus) ?? ADJUSTMENT_STATUS.DRAFT;

 const createAdjustment = useCreateAdjustment();
 const submitAdjustment = useSubmitAdjustment({ onConflict });
 const approveAdjustment = useApproveAdjustment({ onConflict });
 const rejectAdjustment = useRejectAdjustment({ onConflict });
 const postAdjustment = usePostAdjustment({ onConflict });
 const updateAdjustment = useUpdateAdjustment({ onConflict });
 const cancelAdjustment = useCancelAdjustment({ onConflict });
 const editAdjustment = useEditAdjustment({ onConflict });
 const abortController = useAbortController();

 const { data: itemsData, isLoading: isLoadingItems } = useItems(); const items = itemsData?.data || [];
 const { data: varianceReasonsData } = useVarianceReasons();
 const { data: warehousesData } = useWarehouses();
 const warehouses = warehousesData?.data || [];

 const [warehouseId, setWarehouseId] = useState(document?.warehouseId || (warehouses.length > 0 ? warehouses[0].id : ''));
 const { data: lockState } = useWarehouseLock(warehouseId);
 const [reason, setReason] = useState<string>(document?.reason || 'DAMAGE');
 const [notes, setNotes] = useState(document?.notes || '');
 const [lines, setLines] = useState<AdjustmentLine[]>(document?.lines || []);
 const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

 const hasNegativeStock = useMemo(
  () => lines.some(line => line.direction === 'DECREASE' && line.qtyAdjusted > (line.qtyBefore ?? 0)),
  [lines]
 );

 const hasInvalidCosts = useMemo(
  () => lines.some(line => line.direction === 'INCREASE' && (line.unitCost === null || line.unitCost === undefined || line.unitCost < 0)),
  [lines]
 );

 const warehouseItems = useMemo(() => 
  warehouses.map(w => ({ id: w.id, name: w.name || '' })),
 [warehouses]);

 const fallbackReasons = ['DAMAGE', 'EXPIRY', 'THEFT', 'COUNTING_ERROR', 'CORRECTION', 'OTHER'];
 const reasonItems = useMemo(() => {
  const reasons = varianceReasonsData?.data;
  if (reasons && reasons.length > 0) {
   return reasons.map(r => ({
    id: r.code,
    name: r.name,
   }));
  }
  return fallbackReasons.map(opt => ({
   id: opt,
   name: t(`reason_${opt.toLowerCase()}`) || opt,
  }));
 }, [t, varianceReasonsData]);

 const canEdit = !isLocked || isNew;
 
 // Dialog States
 const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
 const [approveDialogOpen, setApproveDialogOpen] = useState(false);
 const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
 const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">("idle");
 const [statusMessage, setStatusMessage] = useState<string | undefined>();
 const [postDialogOpen, setPostDialogOpen] = useState(false);
 const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
 const [cancelReason, setCancelReason] = useState('');
 const [rejectionComment, setRejectionComment] = useState('');
 const [isRefreshingStock, setIsRefreshingStock] = useState(false);

 // Sync state with adjustment data when it arrives or changes records
 const [prevAdjustmentId, setPrevAdjustmentId] = useState<string | null>(null);
 if (document && document.id !== prevAdjustmentId) {
  setPrevAdjustmentId(document.id);
  setWarehouseId(document.warehouseId);
  setReason(document.reason);
  setNotes(document.notes ?? '');
  setLines(document.lines);
  setIdempotencyKey(crypto.randomUUID());
 }

 // Refresh stock levels when warehouse changes
 useEffect(() => {
  if (canEdit && lines.length > 0) {
   setIsRefreshingStock(true);
   const refreshStock = async () => {
    const BalanceSchema = z.object({
     data: z.array(z.object({
      qtyOnHand: z.number()
     }))
    });
    
    try {
     const updatedLines = await Promise.all(lines.map(async (line) => {
      try {
       const balanceRes = await apiClient.get(
        `/inventory/balance?warehouse_id=${warehouseId}&search=${line.item.code}`, 
        BalanceSchema,
        { signal: abortController.signal }
       );
       const currentQty = balanceRes.data?.[0]?.qtyOnHand ?? 0;
       return { ...line, qtyBefore: currentQty };
      } catch (err) {
       if (err instanceof Error && err.name === 'AbortError') throw err;
       return line;
      }
     }));
     
     const hasChanged = updatedLines.some((l, i) => l.qtyBefore !== lines[i].qtyBefore);
     if (hasChanged && !abortController.signal.aborted) {
      setLines(updatedLines);
     }
    } catch (err) {
     if (err instanceof Error && err.name === 'AbortError') return;
     console.error('Failed to refresh stock:', err);
    } finally {
     if (!abortController.signal.aborted) {
      setIsRefreshingStock(false);
     }
    }
   };
   
   refreshStock();
  }
 }, [warehouseId, canEdit, abortController]);

 const handleSaveDraft = async () => {
  if (lines.length === 0) return;
  if (hasNegativeStock) {
   toast.error(t('errors.negative_stock_not_allowed'));
   return;
  }
   if (hasInvalidCosts) {
    toast.error(locale === 'ar' ? 'تكلفة الوحدة مطلوبة ويجب أن تكون أكبر من أو تساوي 0 لبنود الزيادة' : 'Unit cost is required and must be >= 0 for increase lines.');
    return;
   }
  try {
   const payload = {
    version: document?.version || 0,
    warehouseId,
    reason,
    notes,
    lines: lines.map(l => ({
     id: l.id.startsWith('new-') ? undefined : l.id,
     itemId: l.item.id,
     qty: l.qtyAdjusted,
     uomId: l.uomId,
     direction: l.direction,
     unitCost: l.direction === 'INCREASE' ? l.unitCost : null,
     lotAllocations: l.lotAllocations?.length ? l.lotAllocations : undefined,
    }))
   };

   const headers = { 'X-Idempotency-Key': idempotencyKey };

   if (isNew) {
    await createAdjustment.mutateAsync({ payload, signal: abortController.signal, headers });
    toast.success(t('create_success'));
    router.push(`/adjustments`);
   } else {
    await updateAdjustment.mutateAsync({ id, payload, signal: abortController.signal, headers });
    toast.success(t('update_success'));
   }
  } catch (e) {
   console.error(e);
   toast.error(tc('error_occurred'));
  }
 };

 const handleSubmit = async () => {
  if (hasNegativeStock) {
   toast.error(t('errors.negative_stock_not_allowed'));
   return;
  }
  await submitAdjustment.mutateAsync({ id, version: document?.version || 0, signal: abortController.signal });
  toast.success(t('submit_success'));
  setSubmitDialogOpen(false);
 };

 const handleApprove = async () => {
  await approveAdjustment.mutateAsync({ id, version: document?.version || 0, signal: abortController.signal });
  toast.success(t('approve_success'));
  setApproveDialogOpen(false);
 };

 const handleReject = async () => {
  const trimmedComment = rejectionComment.trim();
  if (trimmedComment.length < 15) return;
  await rejectAdjustment.mutateAsync({ 
   id,
   version: document?.version || 0, 
   reject: trimmedComment,
   signal: abortController.signal 
  });
  toast.success(t('reject_success'));
  setRejectDialogOpen(false);
 };

 const handlePost = async () => {
  await postAdjustment.mutateAsync({ id, version: document?.version || 0, signal: abortController.signal });
  setPostDialogOpen(false);
  router.push(`/adjustments`);
 };

 const handleScan = async (barcode: string) => {
  if (!canEdit) {
   audioAlerts.playScanBlocked();
   setScanStatus("error");
   setStatusMessage(t('warehouse_locked_title') || "Warehouse is locked. Scan blocked.");
   return;
  }
  
  const resetAfterDelay = () => {
   setTimeout(() => {
    setScanStatus("idle");
    setStatusMessage(undefined);
   }, 2000);
  };

  try {
   setScanStatus("idle");
   setStatusMessage(undefined);

   const ItemSchema = z.object({
    data: z.array(z.object({
     id: z.string(), code: z.string(), name: z.string(),
     primaryUom: z.object({ id: z.string(), code: z.string() })
    }))
   });
   const res = await apiClient.get(`/master-data/items?barcode=${barcode}`, ItemSchema, { signal: abortController.signal });
   
   if (res.data && res.data.length > 0) {
    const item = res.data[0];
    
    const BalanceSchema = z.object({
     data: z.array(z.object({
      qtyOnHand: z.number()
     }))
    });
    const balanceRes = await apiClient.get(
     `/inventory/balance?warehouse_id=${warehouseId}&search=${item.code}`, 
     BalanceSchema,
     { signal: abortController.signal }
    );
    const currentQty = balanceRes.data?.[0]?.qtyOnHand ?? 0;
 
    setLines(prev => {
     const existing = prev.find(l => l.item.id === item.id);
     if (existing) {
      return prev.map(l => l.item.id === item.id ? { ...l, qtyAdjusted: l.qtyAdjusted + 1, qtyBefore: currentQty } : l);
     }
     return [...prev, {
      id: `new-${Date.now()}`,
      item: {
       id: item.id,
       code: item.code,
       name: item.name,
       primaryUom: item.primaryUom
      },
      direction: 'INCREASE',
      qtyBefore: currentQty,
      qtyAdjusted: 1,
      unitCost: 0,
      uomId: item.primaryUom.id,
      reasonNotes: ''
     }];
    });

    setScanStatus("success");
    setStatusMessage(undefined);
    resetAfterDelay();
   } else {
    setScanStatus("error");
    setStatusMessage(t('scan.not_found'));
    resetAfterDelay();
   }
  } catch {
   setScanStatus("error");
   setStatusMessage(tc('error'));
   resetAfterDelay();
  }
 };

 const removeLine = (id: string) => {
  if (!canEdit) return;
  setLines(prev => prev.filter(l => l.id !== id));
 };

 const updateLine = useCallback((id: string, updates: Partial<AdjustmentLine>) => {
  if (!canEdit) return;
  setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
 }, [canEdit]);

 const timelineEntries = useMemo(() => {
  if (!document?.timeline) return [];
  return document.timeline.map(e => ({
   status: e.status.toLowerCase() as Status,
   at: e.at,
   by: e.by
  }));
 }, [document]);

 const extraColumns = useMemo(() => [
  {
   header: locale === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost',
   cell: (line: AdjustmentFormLine) => {
    const isIncrease = line.direction === 'INCREASE';
    return (
     <div className="flex justify-center w-full">
      <UnitCostInput
       value={line.unitCost}
       disabled={!isIncrease || !canEdit}
       placeholder={isIncrease ? '0' : '-'}
       onChange={(val) => {
        updateLine(line.id, { unitCost: val });
       }}
        className={cn(
          "w-full text-center font-black text-lg bg-white dark:bg-[#1A2234] border border-[#b48e67]/40 text-[#0B1220] dark:text-white focus:border-[#b48e67] focus:ring-1 focus:ring-[#b48e67] rounded-lg outline-none transition-all disabled:opacity-30",
          isIncrease && (line.unitCost === null || line.unitCost === undefined || line.unitCost < 0) && "border-red-500/50 focus:ring-red-500/30"
         )}
      />
     </div>
    );
   }
  },
  {
   header: t('direction') || 'Direction',
   cell: (line: AdjustmentFormLine) => (
    <div className="flex justify-center bg-gray-50 border border-gray-200 dark:bg-[#0B1220] dark:border-gray-700 rounded h-8 w-full max-w-[140px] p-0.5 mx-auto">
     <button
      type="button"
      disabled={!canEdit}
      onClick={() => updateLine(line.id, { direction: 'INCREASE' })}
      className={cn(
       "flex flex-1 items-center justify-center gap-1 rounded text-[9px] font-bold uppercase transition-all active:scale-[0.95] disabled:opacity-50",
       line.direction === 'INCREASE'
        ? "bg-[#b48e67]/15 text-[#b48e67] shadow-sm"
        : "text-gray-500 hover:text-[#0B1220] dark:hover:text-gray-300"
      )}
     >
      <ArrowUp className="w-2.5 h-2.5" />
      {t('direction_increase') || (locale === 'ar' ? 'زيادة' : 'Inc')}
     </button>
     <button
      type="button"
      disabled={!canEdit}
      onClick={() => updateLine(line.id, { direction: 'DECREASE' })}
      className={cn(
       "flex flex-1 items-center justify-center gap-1 rounded text-[9px] font-bold uppercase transition-all active:scale-[0.95] disabled:opacity-50",
       line.direction === 'DECREASE'
        ? "bg-status-error/15 text-status-error shadow-sm"
        : "text-gray-500 hover:text-[#0B1220] dark:hover:text-gray-300"
      )}
     >
      <ArrowDown className="w-2.5 h-2.5" />
      {t('direction_decrease') || (locale === 'ar' ? 'نقص' : 'Dec')}
     </button>
    </div>
   )
  },
  {
   header: t('qty_before') || 'Qty Before',
   cell: (line: AdjustmentFormLine) => (
    <div className="flex flex-col items-center gap-0.5 tabular-nums">
     <span className="text-body-md font-bold text-muted-foreground/40" lang="en" dir="ltr">
      {Number(line.qtyBefore).toLocaleString('en-US')}
     </span>
    </div>
   )
  },
  {
   header: tc('table_headers.lot') || 'Lot',
   cell: (line: AdjustmentFormLine) => (
    <AdjustmentLotSelector
     itemId={line.item.id}
     warehouseId={warehouseId}
     value={line.lotAllocations?.[0]?.lotId}
     disabled={!canEdit || !!lockState?.isLocked}
     onChange={(lotId) => {
       updateLine(line.id, {
         lotAllocations: [{ lotId, qty: line.qtyAdjusted }]
       });
     }}
    />
   )
  },
  {
   header: t('qty_after') || 'Qty After',
   cell: (line: AdjustmentFormLine) => {
    const after = line.direction === 'INCREASE' ? line.qtyBefore + line.qtyAdjusted : line.qtyBefore - line.qtyAdjusted;
    return (
     <div className="flex flex-col items-center gap-0.5 tabular-nums">
      <span className={cn(
       "text-body-md font-bold",
       after < 0 ? "text-red-500" : "text-foreground"
      )} lang="en" dir="ltr">
       {Number(after).toLocaleString('en-US')}
      </span>
      {after < 0 && (
       <span className="text-xs text-red-500">{t('errors.exceeds_available_stock')}</span>
      )}
     </div>
    );
   }
  }
 ], [locale, t, tc, canEdit, updateLine, warehouseId, lockState?.isLocked]);

 return (
  <div className="min-h-screen pb-12 animate-in fade-in duration-500 print:bg-card print:p-0 print:m-0 print:pb-0 print:animate-none">
   {/* Print header (visible only when printing) */}
   <div className="print-only print-header p-8 border-b-2 border-gray-300 mb-6">
    <div className="flex justify-between items-start">
     <div>
      <h1 className="text-2xl font-bold uppercase">{tp('adjustment_voucher_title')}</h1>
      <p className="text-sm text-muted-foreground mt-1">{document?.documentNumber || ''}</p>
     </div>
     <div className="text-end text-sm text-muted-foreground">
       <p>{document?.createdAt ? formatDate(document.createdAt, locale as 'ar' | 'en') : ''}</p>
     </div>
    </div>
   </div>
   {/* Sticky Glass Header */}
   <StickyGlassHeader
    title={isNew ? t('create_new') : (document?.documentNumber || '...')}
    statusBadge={!isNew ? (
     <>
      <StatusBadge status={adjustmentStatus as BadgeStatus} />
      <ClientOnlyTime 
       date={document?.createdAt} 
       mode="date" 
       locale={locale as 'ar' | 'en'}
       className="text-label-xxs font-semibold uppercase text-muted-foreground/40 shrink-0"
      />
     </>
    ) : undefined}
    actions={<DocumentExportMenu documentType="ADJUSTMENT" documentId={isNew ? undefined : id} documentNumber={document?.documentNumber} />}
    isEditing={true}
   />

   <form 
    onSubmit={(e) => e.preventDefault()} 
    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6"
   >
    <DocumentLockBanner 
     status={adjustmentStatus} 
     isLocked={isLocked} 
     className="print-hidden"
    />

    {lockState?.isLocked && (
     <div 
      aria-live="assertive"
      className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 animate-pulse print-hidden"
     >
      <AlertCircle className="w-5 h-5 shrink-0" />
      <div className="flex-1">
       <p className="text-label-sm font-bold uppercase">{t('warehouse_locked_title') || "Warehouse Locked"}</p>
       <p className="text-body-xs font-semibold mt-0.5">{t('warehouse_locked_warn_desc') || "This warehouse is locked for stocktake or system adjustments. Edits and scans are permitted with caution."}</p>
      </div>
     </div>
    )}

    <DocumentLockWrapper isLocked={isLocked}>
     <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
      {/* Left Column */}
      <div className="lg:col-span-9 space-y-8 print:max-w-full">
      <div className="bg-card border border-border shadow-sm p-8 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 border border-surface-variant/5">
       <div className="space-y-4">
        <div className="space-y-1.5">
         <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('warehouse')}</label>
         <SmartCombobox
          items={warehouseItems}
          value={warehouseId}
          onSelect={(item) => setWarehouseId(item.id)}
          placeholder={tc('warehouse') || "Select Warehouse"}
          disabled={!canEdit}
          triggerClassName="bg-card border border-border shadow-sm border-none h-12 rounded-lg font-bold text-body-md transition-all focus:ring-1 focus:ring-primary-fixed-dim/10 w-full animate-in fade-in duration-300"
         />
        </div>

        <div className="space-y-1.5">
         <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('reason')}</label>
         <SmartCombobox
          items={reasonItems}
          value={reason}
          onSelect={(item) => setReason(item.id)}
          placeholder={t('reason') || "Select Reason"}
          disabled={!canEdit}
          triggerClassName="bg-card border border-border shadow-sm border-none h-12 rounded-lg font-bold text-body-md transition-all focus:ring-1 focus:ring-primary-fixed-dim/10 w-full animate-in fade-in duration-300"
         />
        </div>
       </div>

       <div className="space-y-1.5">
        <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('notes')}</label>
        <Textarea
         value={notes}
         onChange={e => setNotes(e.target.value)}
         readOnly={!canEdit}
         placeholder={t('notes_placeholder')}
          className={cn(
           "h-[calc(6rem+3rem+1rem)] p-4 text-body-md resize-none transition-all w-full",
           (!canEdit) 
             ? "bg-white/5 border border-white/10 rounded-xl p-3 min-h-[100px] text-muted-foreground cursor-default select-all focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
             : "bg-card border border-border shadow-sm focus:ring-1 focus:ring-primary-fixed-dim/10"
          )}
        />
       </div>
      </div>

      {/* Input Bars (Scanning + Combobox) */}
      {canEdit && adjustmentStatus !== ADJUSTMENT_STATUS.POSTED && (
       <div className="bg-card border border-border shadow-sm p-8 rounded-lg shadow-sm space-y-6 border border-surface-variant/5 print-hidden">
        <div className="flex items-center gap-3">
         <Package className="w-5 h-5 text-primary" />
         <h3 className="text-label-sm font-semibold uppercase">{t('add_item')}</h3>
        </div>
        
         <div className="space-y-2 relative">
          <ScanInput 
           onScan={handleScan}
           placeholder={t('scan_placeholder')}
           scanStatus={scanStatus}
           statusMessage={statusMessage}
           disabled={isRefreshingStock}
           className="w-full"
          />
         </div>
         <div className="space-y-2 relative">
          <SmartCombobox
           items={items || []}
           onSelect={(item) => handleScan(item.code)}
           placeholder={locale === 'ar' ? 'ابحث عن صنف لإضافته...' : 'Search item to add...'}
           disabled={isLoadingItems || !canEdit || isRefreshingStock}
          />
         </div>
        
       </div>
      )}

      {/* Items Table */}
      {isRefreshingStock && (
       <InlineLoader label={t('refreshing_stock')} className="mb-2" />
      )}
      <div className="bg-card border border-border shadow-sm rounded-lg shadow-sm overflow-hidden border border-surface-variant/5">
       <div className="p-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
         <div className="w-1.5 h-6 bg-primary rounded-full" />
         <h3 className="text-label-sm font-semibold uppercase">{tc('items')}</h3>
        </div>
       </div>
       <div className="bg-card border border-border shadow-sm/30 rounded-[2rem] border border-white/5 mx-4 mb-4 overflow-hidden">
        <DocumentLineItemTable<AdjustmentFormLine>
         lines={lines.map(l => ({
          ...l,
          qty: l.qtyAdjusted,
          lot: l.lot ? {
           lotNumber: l.lot.lotNumber,
           expiryDate: l.lot.expiryDate ?? null,
          } : null,
          lotAllocations: l.lotAllocations?.map(la => ({
           lotId: la.lotId,
           lotNumber: '',
           allocatedQty: la.qty,
           qty: la.qty,
          }))
         }))}
         locale={locale as 'ar' | 'en'}
         isReadOnly={!canEdit || !!lockState?.isLocked}
         onRemoveLine={(id) => removeLine(id)}
         hideLotColumns={true}
         dense={true}
         noCollapse={false}
         mobileLayoutPattern="adjustment-form"
         headers={{
          qty: t('qty_adjusted')
         }}
         renderQty={(line) => (
          <div className="flex justify-center w-full">
           <Input
            type="number"
            min="0.001"
            step="0.001"
            value={line.qty}
            lang="en"
            dir="ltr"
            style={{ direction: 'ltr' }}
            readOnly={!canEdit || !!lockState?.isLocked}
            onChange={(e) => {
             const val = parseFloat(e.target.value);
             updateLine(line.id, { qtyAdjusted: val || 0 });
            }}
             className="w-full text-center font-black text-lg bg-white dark:bg-[#1A2234] border border-[#b48e67]/40 text-[#0B1220] dark:text-white focus:border-[#b48e67] focus:ring-1 focus:ring-[#b48e67] rounded-lg outline-none transition-all"
           />
          </div>
         )}
         extraColumns={extraColumns}
        />
       </div>
      </div>
     </div>

     {/* Right Column */}
     <div className="lg:col-span-3 space-y-8 print-hidden">
      <div className="bg-card border border-border shadow-sm p-8 rounded-lg shadow-sm relative overflow-hidden group border border-surface-variant/5">
       <div className="absolute top-0 end-0 w-32 h-32 bg-primary/5 blur-[50px] -me-16 -mt-16 rounded-full group-hover:bg-primary/10 transition-all duration-700" />
       <div className="relative space-y-8">
        <div className="flex items-center gap-4">
         <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <History className="w-5 h-5 text-primary" />
         </div>
         <h4 className="text-label-xs font-semibold uppercase">{tc('audit_trail')}</h4>
        </div>
        {timelineEntries.length > 0 ? (
         <div className="ps-2">
          <StatusTimeline entries={timelineEntries} />
         </div>
        ) : (
         <div className="flex flex-col items-center justify-center py-8 opacity-20 gap-3">
          <Clock className="w-10 h-10" />
          <p className="text-label-xs font-semibold uppercase">{t('no_history')}</p>
         </div>
        )}
       </div>
      </div>

      {!isNew && (
       <div className="bg-card border border-border shadow-sm p-8 rounded-lg shadow-sm space-y-6 border border-surface-variant/5">
        <div className="flex items-center gap-4">
         <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
          <Info className="w-5 h-5 text-foreground" />
         </div>
         <h4 className="text-label-xs font-semibold uppercase">{t('document_info')}</h4>
        </div>
        <div className="space-y-4">
         <div className="flex justify-between items-center py-3">
          <span className="text-label-sm text-muted-foreground">{tc('status')}</span>
          <StatusBadge status={adjustmentStatus as BadgeStatus} />
         </div>
         {document?.postedAt && (
          <div className="flex justify-between items-center py-3">
           <span className="text-label-sm text-muted-foreground">{t('posted_at')}</span>
           <ClientOnlyTime 
            date={document.postedAt} 
            mode="datetime" 
            locale={locale as 'ar' | 'en'}
            className="text-label-xs font-bold"
           />
          </div>
         )}
         {document?.approvedBy && (
          <div className="flex justify-between items-center py-3">
           <span className="text-label-sm text-muted-foreground">{t('approved_by')}</span>
           <span className="text-label-xs font-semibold uppercase text-foreground/70">{document.approvedBy}</span>
          </div>
         )}
        </div>
       </div>
      )}
     </div>
      </div>
     </div>
    </DocumentLockWrapper>

    {isLocked ? (
     <div className="sticky bottom-0 w-full bg-background/95 backdrop-blur-md border-t border-border/50 p-4 z-50 flex items-center justify-between print-hidden">
      {/* Start Edge (RTL Right): Cancel / Close */}
      <div>
       <button 
        type="button"
        onClick={() => router.push('/adjustments')}
        className="px-6 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-foreground font-semibold flex items-center gap-2"
       >
        <XIcon className="w-4 h-4" /> {tc('actions.close')}
       </button>
      </div>
      {/* End Edge (RTL Left): Approval Actions */}
      <div className="flex items-center gap-3">
       {isLocked && (
        <VoidButton
         documentId={id}
         documentType="ADJUSTMENT"
         status={adjustmentStatus}
         version={document?.version || 1}
        />
       )}
       <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="SUBMIT" role={user?.role || ''} disabled={hasNegativeStock}>
        <button
         type="button"
         onClick={() => setSubmitDialogOpen(true)}
         className="px-8 py-2.5 rounded-xl bg-brand-gold text-brand-black font-bold hover:brightness-110 flex items-center gap-2"
        >
         <Send className="w-4 h-4" /> {t('submit_for_approval')}
        </button>
       </ActionGuard>

       <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="EDIT" role={user?.role || ''}>
        <button
         type="button"
         onClick={() => editAdjustment.mutate({ id, version: document?.version ?? 0 })}
         className="px-8 py-2.5 rounded-xl bg-brand-gold text-brand-black font-bold hover:brightness-110 flex items-center gap-2"
        >
         <Pencil className="w-4 h-4" /> {t('edit_rejected')}
        </button>
       </ActionGuard>

       <PermissionGate action="reject" resource="operations_adjustments">
        <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="REJECT" role={user?.role || ''}>
         <button
          type="button"
          onClick={() => setRejectDialogOpen(true)}
          className="px-6 py-2.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold flex items-center gap-2"
         >
          <XCircleIcon className="w-5 h-5" /> {t('reject')}
         </button>
        </ActionGuard>
       </PermissionGate>
       
       <PermissionGate action="approve" resource="operations_adjustments">
        <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="APPROVE" role={user?.role || ''} disabled={hasNegativeStock}>
         <button
          type="button"
          onClick={() => setApproveDialogOpen(true)}
          className="px-8 py-2.5 rounded-xl bg-brand-gold text-brand-black font-bold hover:brightness-110 flex items-center gap-2"
         >
          <CheckCircleIcon className="w-5 h-5" /> {t('approve')}
         </button>
        </ActionGuard>
       </PermissionGate>

       <PermissionGate action="post" resource="operations_adjustments">
        <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="POST" role={user?.role || ''} disabled={hasNegativeStock}>
         <button
          type="button"
          onClick={() => setPostDialogOpen(true)}
          className="px-8 py-2.5 rounded-xl bg-brand-gold text-brand-black font-bold hover:brightness-110 flex items-center gap-2"
         >
          <CheckCircleIcon className="w-5 h-5" /> {t('post_adjustment')}
         </button>
        </ActionGuard>
       </PermissionGate>

       <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="CANCEL" role={user?.role || ''}>
        <button
         type="button"
         onClick={() => setCancelDialogOpen(true)}
         className="px-6 py-2.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold flex items-center gap-2"
        >
         <XCircleIcon className="w-5 h-5" /> {t('cancel_adjustment')}
        </button>
       </ActionGuard>
      </div>
     </div>
    ) : (
     <FormFooter 
      onCancel={() => router.push(`/adjustments`)}
      cancelLabel={tc('actions.cancel')}
      onSubmit={handleSaveDraft}
      isSaving={createAdjustment.isPending || updateAdjustment.isPending}
      isLocked={isLocked}
      isDirty={lines.length > 0}
      isValid={!hasNegativeStock && !hasInvalidCosts && lines.length > 0 && notes.trim().length >= 10 && !isRefreshingStock}
      className="print-hidden"
      actions={
       !isNew && (
        <div className="flex items-center gap-3 w-full md:w-auto md:me-auto">
         <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="SUBMIT" role={user?.role || ''} disabled={hasNegativeStock}>
          <Button 
           variant="outline"
           onClick={() => setSubmitDialogOpen(true)}
           className="w-full md:w-auto h-12 md:h-10 bg-[#0B1220] dark:bg-[#b48e67] text-white dark:text-[#0B1220] font-bold rounded-md shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-opacity border-none uppercase text-sm tracking-wider px-8"
          >
           <Send className="w-5 h-5 me-2" />
           {t('submit_for_approval')}
          </Button>
         </ActionGuard>
        </div>
       )
      }
     />
    )}
   </form>

   {/* Confirmation Dialogs */}
   <PostConfirmDialog
    open={submitDialogOpen}
    onOpenChange={setSubmitDialogOpen}
    title={t('submit_confirm_title')}
    description={t('submit_confirm_desc')}
    onConfirm={handleSubmit}
    isLoading={submitAdjustment.isPending}
   />

   <PostConfirmDialog
    open={rejectDialogOpen}
    onOpenChange={setRejectDialogOpen}
    title={t('reject_title')}
    description={t('reject_desc')}
    onConfirm={handleReject}
    variant="destructive"
    icon="reject"
    confirmText={t('confirm_rejection')}
    disabled={rejectionComment.trim().length < 15}
   >
    <div className="space-y-4">
     <label className="text-label-xs font-bold text-muted-foreground/40 uppercase ms-1">
      {t('rejection_reason_label')}
     </label>
     <Textarea
      value={rejectionComment}
      onChange={e => setRejectionComment(e.target.value)}
      placeholder={t('rejection_comment_placeholder')}
      className="bg-surface-container-high/40 border-none rounded-2xl min-h-[120px] p-4 text-body-md font-medium focus:ring-1 focus:ring-operational-cyan/30 resize-none transition-all"
     />
     {rejectionComment.trim().length > 0 && rejectionComment.trim().length < 15 && (
      <div className="flex items-center gap-2 text-status-error p-3 bg-status-error/5 rounded-xl border border-status-error/10">
       <AlertCircle className="w-3.5 h-3.5" />
       <p className="text-label-xxs font-bold uppercase">
        {t('min_chars_required', { count: 15 - rejectionComment.trim().length })}
       </p>
      </div>
     )}
    </div>
   </PostConfirmDialog>

   <PostConfirmDialog
    open={approveDialogOpen}
    onOpenChange={setApproveDialogOpen}
    title={t('approve_confirm_title')}
    description={t('approve_confirm_desc')}
    onConfirm={handleApprove}
    isLoading={approveAdjustment.isPending}
   />

   <PostConfirmDialog
    open={postDialogOpen}
    onOpenChange={setPostDialogOpen}
    title={t('post_confirm_title')}
    description={t('post_confirm_desc')}
    warningText={t('post_irreversible')}
    requiresTextConfirmation={true}
    onConfirm={handlePost}
    isLoading={postAdjustment.isPending}
   />

   <PostConfirmDialog
    open={cancelDialogOpen}
    onOpenChange={setCancelDialogOpen}
    title={tc('cancel') || 'Cancel Adjustment'}
    description={t('cancel_confirm_desc') || 'Are you sure you want to cancel this adjustment? This action cannot be undone.'}
    onConfirm={() => {
     cancelAdjustment.mutate(
      { id, version: document?.version ?? 0, reason: cancelReason },
      {
       onSuccess: () => {
        toast.success(t('cancelled_success') || 'Adjustment cancelled');
        setCancelDialogOpen(false);
       },
       onError: () => {
        toast.error(tc('error') || 'Error');
       },
      }
     );
    }}
    variant="destructive"
    icon="reject"
    confirmText={tc('cancel')}
    disabled={cancelAdjustment.isPending}
    isLoading={cancelAdjustment.isPending}
   >
    <div className="space-y-3">
     <label className="text-label-xs font-semibold uppercase text-muted-foreground/50">
      {tc('reason') || 'Reason'} (optional)
     </label>
     <Textarea
      value={cancelReason}
      onChange={(e) => setCancelReason(e.target.value)}
      placeholder={tc('enter_reason') || 'Enter reason...'}
      className="bg-surface-container-high/40 border-none rounded-2xl min-h-[80px] p-4 text-body-md font-medium focus:ring-1 focus:ring-red-500/30 resize-none transition-all"
     />
    </div>
   </PostConfirmDialog>
  </div>
 );
}
