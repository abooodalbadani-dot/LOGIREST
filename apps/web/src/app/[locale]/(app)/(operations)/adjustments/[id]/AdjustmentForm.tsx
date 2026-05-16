'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { useCreateAdjustment } from '@/features/operations/hooks/useCreateAdjustment';
import { useApproveAdjustment } from '@/features/operations/hooks/useApproveAdjustment';
import { usePostAdjustment } from '@/features/operations/hooks/usePostAdjustment';
import { useSubmitAdjustment } from '@/features/operations/hooks/useSubmitAdjustment';
import { useRejectAdjustment } from '@/features/operations/hooks/useRejectAdjustment';
import { useUpdateAdjustment } from '@/features/operations/hooks/useUpdateAdjustment';
import { useAuth } from '@/providers/AuthProvider';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { useAbortController } from '@/hooks/useAbortController';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { 
  CheckCircle, 
  Trash2, 
  Package, 
  Send,
  XCircle, 
  History,
  Info,
  Clock,
  AlertCircle
} from 'lucide-react';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { ADJUSTMENT_STATUS, type DocumentStatus } from '@/contracts/statuses';
import { type AdjustmentLine, type AdjustmentDetail } from '@/features/operations/hooks/useAdjustment';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import { FormFooter } from '@/components/shared/FormFooter';
import { formatQuantity } from '@/utils/currency';

const REASON_OPTIONS = ['DAMAGE', 'EXPIRY', 'THEFT', 'COUNTING_ERROR', 'CORRECTION', 'OTHER'] as const;

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
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  
  const isNew = id === 'new';
  const adjustmentStatus = (document?.status as DocumentStatus) ?? ADJUSTMENT_STATUS.DRAFT;

  const createAdjustment = useCreateAdjustment();
  const submitAdjustment = useSubmitAdjustment(id, { onConflict });
  const approveAdjustment = useApproveAdjustment(id, { onConflict });
  const rejectAdjustment = useRejectAdjustment(id, { onConflict });
  const postAdjustment = usePostAdjustment({ onConflict });
  const updateAdjustment = useUpdateAdjustment({ onConflict });
  const abortController = useAbortController();

  const [warehouseId, setWarehouseId] = useState(document?.warehouse_id || 'wh-1');
  const { data: lockState } = useWarehouseLock(warehouseId);
  const [reason, setReason] = useState<string>(document?.reason || 'DAMAGE');
  const [notes, setNotes] = useState(document?.notes || '');
  const [lines, setLines] = useState<AdjustmentLine[]>(document?.lines || []);
  
  const canEdit = !isLocked || isNew;
  
  // Dialog States
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [rejectionComment, setRejectionComment] = useState('');

  // Sync state with adjustment data when it arrives or changes records
  const [prevAdjustmentId, setPrevAdjustmentId] = useState<string | null>(null);
  if (document && document.id !== prevAdjustmentId) {
    setPrevAdjustmentId(document.id);
    setWarehouseId(document.warehouse_id);
    setReason(document.reason);
    setNotes(document.notes ?? '');
    setLines(document.lines);
  }

  // Refresh stock levels when warehouse changes
  useEffect(() => {
    if (canEdit && lines.length > 0) {
      const refreshStock = async () => {
        const BalanceSchema = z.object({
          data: z.array(z.object({
            qty_on_hand: z.number()
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
              const currentQty = balanceRes.data?.[0]?.qty_on_hand ?? 0;
              return { ...line, qty_before: currentQty };
            } catch (err) {
              if (err instanceof Error && err.name === 'AbortError') throw err;
              return line;
            }
          }));
          
          const hasChanged = updatedLines.some((l, i) => l.qty_before !== lines[i].qty_before);
          if (hasChanged && !abortController.signal.aborted) {
            setLines(updatedLines);
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return;
          console.error('Failed to refresh stock:', err);
        }
      };
      
      refreshStock();
    }
  }, [warehouseId, canEdit, abortController]);

  const handleSaveDraft = async () => {
    if (lines.length === 0) return;
    try {
      const payload = {
        version: document?.version || 0,
        warehouse_id: warehouseId,
        reason,
        notes,
        lines: lines.map(l => ({
          id: l.id.startsWith('new-') ? undefined : l.id,
          item_id: l.item.id,
          qty: l.qty_adjusted,
          uom_id: l.uom_id,
          direction: l.direction
        }))
      };

      if (isNew) {
        await createAdjustment.mutateAsync({ payload, signal: abortController.signal });
        toast.success(t('create_success'));
        router.push(`/adjustments`);
      } else {
        await updateAdjustment.mutateAsync({ id, payload, signal: abortController.signal });
        toast.success(t('update_success'));
      }
    } catch (e) {
      console.error(e);
      toast.error(tc('error_occurred'));
    }
  };

  const handleSubmit = async () => {
    try {
      await submitAdjustment.mutateAsync({ version: document?.version || 0, signal: abortController.signal });
      toast.success(t('submit_success'));
      setSubmitDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error(tc('error_occurred'));
    }
  };

  const handleApprove = async () => {
    if (!!lockState?.isLocked) return;
    try {
      await approveAdjustment.mutateAsync({ version: document?.version || 0, signal: abortController.signal });
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
    if (!!lockState?.isLocked) return;
    try {
      await postAdjustment.mutateAsync({ id, version: document?.version || 0, signal: abortController.signal });
      setPostDialogOpen(false);
      router.push(`/adjustments`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleScan = async (barcode: string) => {
    if (!!lockState?.isLocked || !canEdit) return;
    
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
          id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
          primary_uom: z.object({ id: z.string(), code: z.string() })
        }))
      });
      const res = await apiClient.get(`/master-data/items?barcode=${barcode}`, ItemSchema, { signal: abortController.signal });
      
      if (res.data && res.data.length > 0) {
        const item = res.data[0];
        
        const BalanceSchema = z.object({
          data: z.array(z.object({
            qty_on_hand: z.number()
          }))
        });
        const balanceRes = await apiClient.get(
          `/inventory/balance?warehouse_id=${warehouseId}&search=${item.code}`, 
          BalanceSchema,
          { signal: abortController.signal }
        );
        const currentQty = balanceRes.data?.[0]?.qty_on_hand ?? 0;

        setLines(prev => {
          const existing = prev.find(l => l.item.id === item.id);
          if (existing) {
            return prev.map(l => l.item.id === item.id ? { ...l, qty_adjusted: l.qty_adjusted + 1, qty_before: currentQty } : l);
          }
          return [...prev, {
            id: `new-${Date.now()}`,
            item: {
              ...item,
              name_ar: item.name_ar,
              name_en: item.name_en,
              primary_uom: item.primary_uom
            },
            direction: 'INCREASE',
            qty_before: currentQty,
            qty_adjusted: 1,
            uom_id: item.primary_uom.id,
            reason_notes: ''
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
    if (!!lockState?.isLocked || !canEdit) return;
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const updateLine = (id: string, updates: Partial<AdjustmentLine>) => {
    if (!!lockState?.isLocked || !canEdit) return;
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
    <div className="min-h-screen bg-surface-container-low pb-12 animate-in fade-in duration-500">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-50 w-full glass-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="font-semibold text-title-sm">
              {isNew ? t('create_new') : (document?.document_number || '...')}
            </h1>
            {!isNew && (
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={adjustmentStatus as BadgeStatus} />
                <ClientOnlyTime 
                  date={document?.created_at} 
                  mode="date" 
                  locale={locale as 'ar' | 'en'}
                  className="text-label-xxs font-semibold uppercase text-muted-foreground/40 shrink-0"
                />
              </div>
            )}
          </div>
          {/* Workflow specific actions moved to FormFooter */}
        </div>
      </div>

      <form 
        onSubmit={(e) => e.preventDefault()} 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6"
      >
        <DocumentLockBanner 
          status={adjustmentStatus} 
          isLocked={isLocked} 
        />

        <DocumentLockWrapper isLocked={isLocked}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-8 space-y-8">
            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 border border-surface-variant/5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('warehouse')}</label>
                  <Select 
                    value={warehouseId} 
                    onValueChange={(val) => setWarehouseId(val || '')}
                    disabled={!canEdit || !!lockState?.isLocked}
                  >
                    <SelectTrigger className="bg-surface-container-low border-none h-12 rounded-lg font-bold text-body-md transition-all focus:ring-1 focus:ring-primary-fixed-dim/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-container-highest border-none rounded-lg shadow-2xl">
                      <SelectItem value="wh-1" className="font-bold text-body-md">{tc('warehouses.main')}</SelectItem>
                      <SelectItem value="wh-2" className="font-bold text-body-md">{tc('warehouses.kitchen')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('reason')}</label>
                  <Select 
                    value={reason} 
                    onValueChange={(val) => setReason(val || '')}
                    disabled={!canEdit || !!lockState?.isLocked}
                  >
                    <SelectTrigger className="bg-surface-container-low border-none h-12 rounded-lg font-bold text-body-md transition-all focus:ring-1 focus:ring-primary-fixed-dim/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-container-highest border-none rounded-lg shadow-2xl">
                      {REASON_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt} className="font-bold text-body-md">{t(`reason_${opt.toLowerCase()}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('notes')}</label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  disabled={!canEdit || !!lockState?.isLocked}
                  placeholder={t('notes_placeholder')}
                  className="bg-surface-container-low border-none rounded-lg h-[calc(6rem+3rem+1rem)] p-4 text-body-md resize-none focus:ring-1 focus:ring-primary-fixed-dim/10 transition-all"
                />
              </div>
            </div>

            {/* Item Scanning / Adding */}
            {canEdit && adjustmentStatus !== ADJUSTMENT_STATUS.POSTED && (
              <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm space-y-6 border border-surface-variant/5">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary" />
                  <h3 className="text-label-sm font-semibold uppercase">{t('add_item')}</h3>
                </div>
                <ScanInput 
                  onScan={handleScan}
                  placeholder={t('scan_placeholder')}
                  disabled={!!lockState?.isLocked}
                  scanStatus={scanStatus}
                  statusMessage={statusMessage}
                />
              </div>
            )}

            {/* Items Table */}
            <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden border border-surface-variant/5">
              <div className="p-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="text-label-sm font-semibold uppercase">{tc('items')}</h3>
                </div>
              </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low/50">
                        <th className="px-8 h-14 text-start text-label-xs font-semibold uppercase text-muted-foreground/60">{tc('item')}</th>
                        <th className="px-6 h-14 text-center text-label-xs font-semibold uppercase text-muted-foreground/60">{t('direction')}</th>
                        <th className="px-6 h-14 text-center text-label-xs font-semibold uppercase text-muted-foreground/60">{t('qty_before')}</th>
                        <th className="px-6 h-14 text-center text-label-xs font-semibold uppercase text-muted-foreground/60">{t('qty_adjusted')}</th>
                        <th className="px-6 h-14 text-center text-label-xs font-semibold uppercase text-muted-foreground/60">{t('qty_after')}</th>
                        {canEdit && <th className="px-8 h-14 text-end"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y-0">
                      {lines.length === 0 && (
                        <tr>
                          <td colSpan={canEdit ? 6 : 5} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center gap-4 opacity-20">
                              <Package className="w-12 h-12" />
                              <p className="text-label-sm font-semibold uppercase">{tc('no_items')}</p>
                            </div>
                          </td>
                        </tr>
                      )}
                      {lines.map((line) => (
                        <tr key={line.id} className="group even:bg-surface-container-low/30 hover:bg-surface-container-high/20 transition-all border-none">
                          <td className="px-8 py-6">
                            <div className="flex flex-col min-w-0">
                              <span className="text-body-md font-bold truncate">{locale === 'ar' ? line.item.name_ar : line.item.name_en}</span>
                              <span className="text-label-xs font-mono text-primary/40 uppercase mt-1">{line.item.code}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <Select
                              value={line.direction}
                              onValueChange={(val) => updateLine(line.id, { direction: val as 'INCREASE' | 'DECREASE' })}
                              disabled={!canEdit}
                            >
                              <SelectTrigger className="bg-surface-container-low border-none h-10 w-32 mx-auto rounded-lg font-semibold text-label-xs uppercase focus:ring-1 focus:ring-primary-fixed-dim/10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-surface-container-highest border-none rounded-lg shadow-2xl">
                                <SelectItem value="INCREASE" className="font-semibold text-label-xs uppercase text-emerald-500">{t('direction_increase')}</SelectItem>
                                <SelectItem value="DECREASE" className="font-semibold text-label-xs uppercase text-red-500">{t('direction_decrease')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-6 py-6 text-center tabular-nums">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-body-md font-bold text-muted-foreground/40">{formatQuantity(line.qty_before, locale as 'ar' | 'en')}</span>
                              <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">{line.item.primary_uom.code}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center tabular-nums">
                            <div className="flex flex-col items-center gap-0.5">
                              <input 
                                type="number"
                                value={line.qty_adjusted}
                                onChange={e => updateLine(line.id, { qty_adjusted: Number(e.target.value) })}
                                disabled={!canEdit}
                                className="bg-surface-container-low border-none h-10 w-24 text-center rounded-lg font-semibold text-body-md transition-all focus:ring-1 focus:ring-primary-fixed-dim/10"
                                step="0.001"
                                min="0"
                              />
                              <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">{line.item.primary_uom.code}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center tabular-nums">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={cn(
                                "text-body-md font-bold",
                                (line.direction === 'INCREASE' ? line.qty_before + line.qty_adjusted : line.qty_before - line.qty_adjusted) < 0 ? "text-red-500" : "text-foreground"
                              )}>
                                {formatQuantity(line.direction === 'INCREASE' ? line.qty_before + line.qty_adjusted : line.qty_before - line.qty_adjusted, locale as 'ar' | 'en')}
                              </span>
                              <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">{line.item.primary_uom.code}</span>
                            </div>
                          </td>
                          {canEdit && (
                            <td className="px-8 py-6 text-end">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeLine(line.id)}
                                className="h-8 w-8 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-8">
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
                  {document?.posted_at && (
                    <div className="flex justify-between items-center py-3">
                      <span className="text-label-sm text-muted-foreground">{t('posted_at')}</span>
                      <ClientOnlyTime 
                        date={document.posted_at} 
                        mode="datetime" 
                        locale={locale as 'ar' | 'en'}
                        className="text-label-xs font-bold"
                      />
                    </div>
                  )}
                  {document?.approved_by && (
                    <div className="flex justify-between items-center py-3">
                      <span className="text-label-sm text-muted-foreground">{t('approved_by')}</span>
                      <span className="text-label-xs font-semibold uppercase text-foreground/70">{document.approved_by}</span>
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
          isValid={lines.length > 0 && notes.trim().length >= 10}
          actions={
            !isNew && (
              <div className="flex items-center gap-3">
                <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="SUBMIT" role={user?.role || 'WH_KEEPER'}>
                  <Button 
                    variant="outline"
                    onClick={() => setSubmitDialogOpen(true)}
                    className="h-14 px-8 border-primary/20 text-primary hover:bg-primary/5 text-label-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                  >
                    <Send className="w-5 h-5 me-3" />
                    {t('submit_for_approval')}
                  </Button>
                </ActionGuard>

                <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="REJECT" role={user?.role || 'WH_KEEPER'}>
                  <Button 
                    variant="ghost" 
                    onClick={() => setRejectDialogOpen(true)}
                    className="h-14 px-8 text-red-500 hover:bg-red-500/5 text-label-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                  >
                    <XCircle className="w-5 h-5 me-3" />
                    {t('reject')}
                  </Button>
                </ActionGuard>
                
                <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="APPROVE" role={user?.role || 'WH_KEEPER'}>
                  <Button 
                    onClick={() => setApproveDialogOpen(true)}
                    className="h-14 px-10 bg-emerald-600 hover:bg-emerald-500 text-white text-label-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-emerald-600/30 border-none"
                  >
                    <CheckCircle className="w-5 h-5 me-3" />
                    {t('approve')}
                  </Button>
                </ActionGuard>

                <ActionGuard documentType="ADJUSTMENT" status={adjustmentStatus} action="POST" role={user?.role || 'WH_KEEPER'}>
                  <Button 
                    onClick={() => setPostDialogOpen(true)}
                    className="h-14 px-12 primary-gradient text-white text-label-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-primary/30 border-none"
                  >
                    <CheckCircle className="w-5 h-5 me-3" />
                    {t('post_adjustment')}
                  </Button>
                </ActionGuard>
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
    </div>
  );
}
