'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Pencil
} from 'lucide-react';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
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
import { FormFooter } from '@/components/shared/FormFooter';
import { formatQuantity } from '@/utils/currency';
import { audioAlerts } from '@/utils/audio';
import { VoidButton } from '@/components/shared/VoidButton';

interface AdjustmentFormProps {
  document?: AdjustmentDetail;
  id: string;
  isLocked: boolean;
  onConflict?: () => void;
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
    () => lines.some(line => line.direction === 'INCREASE' && (line.unitCost === null || line.unitCost === undefined || line.unitCost <= 0)),
    [lines]
  );

  const warehouseItems = useMemo(() => 
    warehouses.map(w => ({ id: w.id, name_en: w.name || '', name_ar: w.name || '' })),
  [warehouses]);

  const fallbackReasons = ['DAMAGE', 'EXPIRY', 'THEFT', 'COUNTING_ERROR', 'CORRECTION', 'OTHER'];
  const reasonItems = useMemo(() => {
    const reasons = varianceReasonsData?.data;
    if (reasons && reasons.length > 0) {
      return reasons.map(r => ({
        id: r.code,
        name_en: r.nameEn,
        name_ar: r.nameAr,
      }));
    }
    return fallbackReasons.map(opt => ({
      id: opt,
      name_en: t(`reason_${opt.toLowerCase()}`) || opt,
      name_ar: t(`reason_${opt.toLowerCase()}`) || opt,
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
      toast.error(locale === 'ar' ? 'تكلفة الوحدة مطلوبة ويجب أن تكون أكبر من 0 لبنود الزيادة' : 'Unit cost is required and must be > 0 for increase lines.');
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
    try {
      await submitAdjustment.mutateAsync({ id, version: document?.version || 0, signal: abortController.signal });
      toast.success(t('submit_success'));
      setSubmitDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error(tc('error_occurred'));
    }
  };

  const handleApprove = async () => {
    try {
      await approveAdjustment.mutateAsync({ id, version: document?.version || 0, signal: abortController.signal });
      toast.success(t('approve_success'));
      setApproveDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error(tc('error_occurred'));
    }
  };

  const handleReject = async () => {
    const trimmedComment = rejectionComment.trim();
    if (trimmedComment.length < 15) return;
    try {
      await rejectAdjustment.mutateAsync({ 
        id,
        version: document?.version || 0, 
        reject: trimmedComment,
        signal: abortController.signal 
      });
      toast.success(t('reject_success'));
      setRejectDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error(tc('error_occurred'));
    }
  };

  const handlePost = async () => {
    try {
      await postAdjustment.mutateAsync({ id, version: document?.version || 0, signal: abortController.signal });
      setPostDialogOpen(false);
      router.push(`/adjustments`);
    } catch (e) {
      console.error(e);
    }
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
          id: z.string(), code: z.string(), nameAr: z.string(), nameEn: z.string(),
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
              nameAr: item.nameAr,
              nameEn: item.nameEn,
              primaryUom: item.primaryUom
            },
            direction: 'INCREASE',
            qtyBefore: currentQty,
            qtyAdjusted: 1,
            unitCost: null,
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

  const updateLine = (id: string, updates: Partial<AdjustmentLine>) => {
    if (!canEdit) return;
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const timelineEntries = useMemo(() => {
    if (!document?.timeline) return [];
    return document.timeline.map(e => ({
      status: e.status.toLowerCase() as Status,
      at: e.at,
      by: e.by
    }));
  }, [document]);
  return (
    <div className="min-h-screen bg-surface-container-low pb-12 animate-in fade-in duration-500 print:bg-white print:p-0 print:m-0 print:pb-0 print:animate-none">
      {/* Print header (visible only when printing) */}
      <div className="print-only print-header p-8 border-b-2 border-gray-300 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold uppercase">{tp('adjustment_voucher_title')}</h1>
            <p className="text-sm text-gray-600 mt-1">{document?.documentNumber || ''}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>{document?.createdAt ? new Date(document.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</p>
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
        actions={<DocumentExportMenu />}
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
            <div className="lg:col-span-8 space-y-8 print:max-w-full">
            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 border border-surface-variant/5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('warehouse')}</label>
                  <SmartCombobox
                    items={warehouseItems}
                    value={warehouseId}
                    onSelect={(item) => setWarehouseId(item.id)}
                    placeholder={tc('warehouse') || "Select Warehouse"}
                    disabled={!canEdit}
                    triggerClassName="bg-surface-container-low border-none h-12 rounded-lg font-bold text-body-md transition-all focus:ring-1 focus:ring-primary-fixed-dim/10 w-full animate-in fade-in duration-300"
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
                    triggerClassName="bg-surface-container-low border-none h-12 rounded-lg font-bold text-body-md transition-all focus:ring-1 focus:ring-primary-fixed-dim/10 w-full animate-in fade-in duration-300"
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
                    "bg-surface-container-low border-none rounded-lg h-[calc(6rem+3rem+1rem)] p-4 text-body-md resize-none transition-all",
                    (!canEdit) ? "cursor-default opacity-85 select-all focus:ring-0 animate-pulse-slow" : "focus:ring-1 focus:ring-primary-fixed-dim/10"
                  )}
                />
              </div>
            </div>

            {/* Input Bars (Scanning + Combobox) */}
            {canEdit && adjustmentStatus !== ADJUSTMENT_STATUS.POSTED && (
              <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm space-y-6 border border-surface-variant/5 print-hidden">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary" />
                  <h3 className="text-label-sm font-semibold uppercase">{t('add_item')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>
            )}

            {/* Items Table */}
            {isRefreshingStock && (
              <InlineLoader label={t('refreshing_stock')} className="mb-2" />
            )}
            <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden border border-surface-variant/5">
              <div className="p-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="text-label-sm font-semibold uppercase">{tc('items')}</h3>
                </div>
              </div>
              <div className="bg-surface-container-low/30 rounded-[2rem] border border-white/5 mx-4 mb-4 overflow-hidden">
                <DocumentLineItemTable
                  lines={lines.map(l => ({ ...l, qty: l.qtyAdjusted, lotAllocations: undefined }))}
                  locale={locale as 'ar' | 'en'}
                  isReadOnly={!canEdit || !!lockState?.isLocked}
                  onRemoveLine={(id) => removeLine(id)}
                  hideLotColumns={true}
                  dense={true}
                  headers={{
                    qty: t('qty_adjusted')
                  }}
                  renderQty={(line) => (
                    <div className="flex justify-center">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={line.qty}
                        readOnly={!canEdit || !!lockState?.isLocked}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateLine(line.id, { qtyAdjusted: val || 0 });
                        }}
                        className="w-24 bg-surface-container-highest/60 border border-white/5 rounded-lg text-center h-9 font-mono text-body-md font-semibold focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all hover:bg-surface-container-highest/80 disabled:opacity-50"
                      />
                    </div>
                  )}
                  extraColumns={[
                    {
                      header: locale === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost',
                      cell: (line: AdjustmentLine) => {
                        const isIncrease = line.direction === 'INCREASE';
                        return (
                          <div className="flex justify-center">
                            <input
                              type="number"
                              min="0.0001"
                              step="0.01"
                              value={line.unitCost ?? ''}
                              readOnly={!canEdit || !isIncrease}
                              disabled={!isIncrease}
                              placeholder={isIncrease ? (locale === 'ar' ? 'مطلوب' : 'Required') : '-'}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateLine(line.id, { unitCost: isNaN(val) ? null : val });
                              }}
                              className={cn(
                                "w-24 bg-surface-container-highest/60 border border-white/5 rounded-lg text-center h-9 font-mono text-body-md font-semibold focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all hover:bg-surface-container-highest/80 disabled:opacity-30",
                                isIncrease && (line.unitCost === null || line.unitCost === undefined || line.unitCost <= 0) && "border-red-500/50 focus:ring-red-500/30"
                              )}
                            />
                          </div>
                        );
                      }
                    },
                    {
                      header: t('direction') || 'Direction',
                      cell: (line: AdjustmentLine) => (
                        <div className="flex justify-center bg-surface-container-low/40 rounded-lg p-0.5 h-9 w-36 mx-auto">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => updateLine(line.id, { direction: 'INCREASE' })}
                            className={cn(
                              "flex flex-1 items-center justify-center gap-1 rounded-md text-[10px] font-bold uppercase transition-all active:scale-[0.95] disabled:opacity-50",
                              line.direction === 'INCREASE'
                                ? "bg-status-success/15 text-status-success shadow-sm"
                                : "text-muted-foreground/30 hover:text-muted-foreground/60"
                            )}
                          >
                            <ArrowUp className="w-3 h-3" />
                            {t('direction_increase')}
                          </button>
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => updateLine(line.id, { direction: 'DECREASE' })}
                            className={cn(
                              "flex flex-1 items-center justify-center gap-1 rounded-md text-[10px] font-bold uppercase transition-all active:scale-[0.95] disabled:opacity-50",
                              line.direction === 'DECREASE'
                                ? "bg-status-error/15 text-status-error shadow-sm"
                                : "text-muted-foreground/30 hover:text-muted-foreground/60"
                            )}
                          >
                            <ArrowDown className="w-3 h-3" />
                            {t('direction_decrease')}
                          </button>
                        </div>
                      )
                    },
                    {
                      header: t('qty_before') || 'Qty Before',
                      cell: (line: AdjustmentLine) => (
                        <div className="flex flex-col items-center gap-0.5 tabular-nums">
                          <span className="text-body-md font-bold text-muted-foreground/40">{formatQuantity(line.qtyBefore, locale as 'ar' | 'en')}</span>
                        </div>
                      )
                    },
                    {
                      header: t('qty_after') || 'Qty After',
                      cell: (line: AdjustmentLine) => {
                        const after = line.direction === 'INCREASE' ? line.qtyBefore + line.qtyAdjusted : line.qtyBefore - line.qtyAdjusted;
                        return (
                          <div className="flex flex-col items-center gap-0.5 tabular-nums">
                            <span className={cn(
                              "text-body-md font-bold",
                              after < 0 ? "text-red-500" : "text-foreground"
                            )}>
                              {formatQuantity(after, locale as 'ar' | 'en')}
                            </span>
                            {after < 0 && (
                              <span className="text-xs text-red-500">{t('errors.exceeds_available_stock')}</span>
                            )}
                          </div>
                        );
                      }
                    }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-8 print-hidden">
            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm relative overflow-hidden group border border-surface-variant/5">
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
              <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm space-y-6 border border-surface-variant/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Info className="w-5 h-5 text-emerald-500" />
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

        <FormFooter 
          onCancel={() => router.push(`/adjustments`)}
          onSubmit={handleSaveDraft}
          isSaving={createAdjustment.isPending || updateAdjustment.isPending}
          isLocked={isLocked}
          isDirty={lines.length > 0}
          isValid={!hasNegativeStock && !hasInvalidCosts && lines.length > 0 && notes.trim().length >= 10 && !isRefreshingStock}
          className="print-hidden"
          actions={
            !isNew && (
              <div className="flex items-center gap-3">
                {isLocked && (
                  <VoidButton
                    documentId={id}
                    documentType="ADJUSTMENT"
                    status={adjustmentStatus}
                    version={document?.version || 1}
                  />
                )}
                {!isLocked && (
                  <>
                    <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="SUBMIT" role={user?.role} disabled={hasNegativeStock}>
                      <Button 
                        variant="outline"
                        onClick={() => setSubmitDialogOpen(true)}
                        className="h-14 px-8 border-primary/20 text-primary hover:bg-primary/5 text-label-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                      >
                        <Send className="w-5 h-5 me-3" />
                        {t('submit_for_approval')}
                      </Button>
                    </ActionGuard>

                    <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="EDIT" role={user?.role}>
                      <Button 
                        variant="outline"
                        onClick={() => editAdjustment.mutate({ id, version: document?.version ?? 0 })}
                        className="h-14 px-8 border-primary/20 text-primary hover:bg-primary/5 text-label-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                      >
                        <Pencil className="w-5 h-5 me-3" />
                        {t('edit_rejected')}
                      </Button>
                    </ActionGuard>

                    <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="REJECT" role={user?.role}>
                      <Button 
                        variant="ghost" 
                        onClick={() => setRejectDialogOpen(true)}
                        className="h-14 px-8 text-red-500 hover:bg-red-500/5 text-label-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                      >
                        <XCircle className="w-5 h-5 me-3" />
                        {t('reject')}
                      </Button>
                    </ActionGuard>
                    
                    <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="APPROVE" role={user?.role} disabled={hasNegativeStock}>
                      <Button 
                        onClick={() => setApproveDialogOpen(true)}
                        className="h-14 px-10 bg-emerald-600 hover:bg-emerald-500 text-white text-label-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-emerald-600/30 border-none"
                      >
                        <CheckCircle className="w-5 h-5 me-3" />
                        {t('approve')}
                      </Button>
                    </ActionGuard>

                    <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="POST" role={user?.role || ''} disabled={hasNegativeStock}>
                      <Button 
                        onClick={() => setPostDialogOpen(true)}
                        className="h-14 px-12 primary-gradient text-white text-label-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-primary/30 border-none"
                      >
                        <CheckCircle className="w-5 h-5 me-3" />
                        {t('post_adjustment')}
                      </Button>
                    </ActionGuard>

                    <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="CANCEL" role={user?.role || ''}>
                      <Button 
                        variant="ghost" 
                        onClick={() => setCancelDialogOpen(true)}
                        className="h-14 px-8 text-red-400 hover:bg-red-500/10 hover:text-red-500 text-label-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                      >
                        <XCircle className="w-5 h-5 me-3" />
                        {tc('cancel')}
                      </Button>
                    </ActionGuard>
                  </>
                )}
              </div>
            )
          }
        />
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
