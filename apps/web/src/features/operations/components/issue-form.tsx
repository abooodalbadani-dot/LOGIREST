"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { AlertCircle, History, Package, Clock, User, FileText, ArrowRight, ArrowLeft, Scan, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { FEFOLotAllocator } from '@/components/shared/FEFOLotAllocator/FEFOLotAllocator';
import { useLotsByItem } from '@/features/operations/hooks/useLotsByItem';
import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import { FormFooter } from '@/components/layouts/FormLayout';
import { usePostIssue } from '@/features/operations/hooks/usePostIssue';
import { useSubmitIssue } from '@/features/operations/hooks/useSubmitIssue';
import { LockBanner } from '@/components/shared/LockBanner';
import { toast } from 'sonner';
import { audioAlerts } from '@/utils/audio';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { VoidButton } from '@/components/shared/VoidButton';
import { useCancelIssue } from '@/features/operations/hooks/useCancelIssue';
import { Trash2 } from 'lucide-react';

import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { formatDate } from '@/utils/currency';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isDocumentLocked, type DocumentStatus } from '@logirest/shared-types';
import { useAuth } from '@/providers/AuthProvider';
import type { LotAllocation, StockIssue, IssueLineItem } from '@/types/documents';
import { StatusTimeline, type StatusTimelineEntry, type Status } from '@/components/shared/StatusTimeline';
import { cn } from '@/lib/utils';
import { ISSUE_STATUS } from '@logirest/shared-types';
import { useAbortController } from '@/hooks/useAbortController';

import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { SmartCombobox, ComboboxItem } from '@/components/shared/SmartCombobox';
import { useItems } from '@/features/items/hooks/useItems';
import { RelationalName } from '@/components/shared/RelationalName';

interface IssueFormProps {
  issue?: StockIssue;
  id: string;
  isNew: boolean;
  onConflict?: () => void;
}

export function IssueForm({ issue, id, isNew, onConflict }: IssueFormProps) {
  const t = useTranslations('operations.issue');
  const locale = useLocale();
  const { user, activeScope } = useAuth();
  const abortController = useAbortController();

  const postIssue = usePostIssue({ onConflict });
  const isPostPending = postIssue.isPending;
  const submitIssue = useSubmitIssue({ onConflict });
  const cancelIssue = useCancelIssue({ onConflict });
  const { playSound } = useAudioFeedback();

  const { data: itemsData } = useItems(); const items = itemsData?.data || [];

  const toLineItem = (l: IssueLineItem): LineItem => ({
    id: l.id,
    item: {
      id: l.item.id,
      code: l.item.code,
      name: l.item.name,
      primaryUom: { code: l.item.primaryUom?.code || l.uomId || '' },
    },
    lot: l.lot ? { lotNumber: l.lot.lotNumber, expiryDate: l.lot.expiryDate } : null,
    qty: l.qty,
    uomId: l.uomId,
    lotAllocations: l.lotAllocations,
  });

  const [lines, setLines] = useState<LineItem[]>(() => (issue?.lines || []).map(toLineItem));
  const [destinationId, setDestinationId] = useState(() => issue?.destinationDeptId ?? '');
  const [warehouseId] = useState(() => issue?.warehouseId || activeScope.warehouseId || '');
  const [notes, setNotes] = useState(() => issue?.notes || '');
  const [scanError, setScanError] = useState('');
  const [requestedBy, setRequestedBy] = useState(() => issue?.requestedBy ?? '');

  const lastResetId = useRef<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (issue && issue.id !== lastResetId.current) {
      lastResetId.current = issue.id;
      setLines((issue.lines || []).map(toLineItem));
      setDestinationId(issue.destinationDeptId ?? '');
      setNotes(issue.notes || '');
      setRequestedBy(issue.requestedBy ?? '');
      setIdempotencyKey(crypto.randomUUID());
    }
  }, [issue]);

  // Unsaved Changes Guard
  const isDirty = useMemo(() => {
    if (isNew) {
      return lines.length > 0 || !!destinationId || !!notes || !!requestedBy;
    }

    // Check if lines have changed
    const linesChanged = JSON.stringify(lines) !== JSON.stringify(issue?.lines || []);
    const destChanged = destinationId !== (issue?.destinationDeptId ?? '');
    const notesChanged = notes !== (issue?.notes || '');
    const reqByChanged = requestedBy !== (issue?.requestedBy ?? '');

    return linesChanged || destChanged || notesChanged || reqByChanged;
  }, [isNew, lines, destinationId, notes, requestedBy, issue]);

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isWarehouseLockedError, setIsWarehouseLockedError] = useState(false);

  // FEFO Allocator State
  const [fefoOpen, setFefoOpen] = useState(false);
  const [activeLine, setActiveLine] = useState<LineItem | null>(null);

  const { data: deptData } = useDepartments();
  const departments = deptData?.data || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length > 0 && !!destinationId) {
      setIsPostDialogOpen(true);
    }
  };

  // Auto fetch lots when activeLine changes
  const { data: lots = [] } = useLotsByItem({
    itemId: activeLine?.item?.id || '',
    warehouseId: warehouseId
  });

  // Lock Banner state
  const { data: lockState } = useWarehouseLock(warehouseId);

  // Workflow Engine Integrations
  const status = (issue?.status || ISSUE_STATUS.DRAFT) as DocumentStatus;
  const isDocLocked = isDocumentLocked("ISSUE", status);
  const isWarehouseLocked = (lockState?.isLocked ?? false) || isWarehouseLockedError;
  const effectiveIsLocked = isDocLocked || isSubmitted;

  const handleScan = async (barcode: string) => {

    try {
      const ItemSchema = z.object({
        data: z.array(z.object({
          id: z.string(),
          code: z.string(),
          name: z.string(),
          nameAr: z.string().optional(),
          nameEn: z.string().optional(),
          primaryUom: z.object({
            id: z.string(),
            code: z.string(),
            name: z.string().optional(),
            nameAr: z.string().optional(),
            nameEn: z.string().optional()
          })
        }))
      });
      const res = await apiClient.get(`/master-data/items?barcode=${barcode}`, ItemSchema, { signal: abortController.signal });
      if (!res.data || res.data.length === 0) {
        setScanError(t('no_item_found'));
        playSound('error');
        toast.error(t('no_item_found'));
        throw new Error('ItemNotFound');
      }

      const item = res.data[0];

      // Query available lots for the item
      const LotsResponseSchema = z.object({
        data: z.array(z.object({
          id: z.string(),
          itemId: z.string(),
          lotNumber: z.string(),
          expiryDate: z.string(),
          totalQty: z.number().optional(),
          qtyAvailable: z.number().optional(),
          isExpired: z.boolean().optional(),
          isNearExpiry: z.boolean().optional(),
        }))
      });

      const lotsRes = await apiClient.get(
        `/operations/lots-available?itemId=${item.id}&warehouseId=${warehouseId}`,
        LotsResponseSchema,
        { signal: abortController.signal }
      );

      const availableLots = (lotsRes.data || []).map((lotItem) => ({
        id: lotItem.id,
        itemId: lotItem.itemId,
        warehouseId: warehouseId,
        lotNumber: lotItem.lotNumber,
        expiryDate: lotItem.expiryDate,
        qtyAvailable: lotItem.totalQty ?? lotItem.qtyAvailable ?? 0,
        isExpired: lotItem.isExpired ?? false,
        isNearExpiry: lotItem.isNearExpiry ?? false,
      }));

      const validLots = availableLots
        .filter(l => !l.isExpired && l.qtyAvailable > 0)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      const existingLine = lines.find(l => l.item.id === item.id);
      const targetQty = existingLine ? existingLine.qty + 1 : 1;
      const totalAvailable = validLots.reduce((sum, lot) => sum + lot.qtyAvailable, 0);

      if (totalAvailable <= 0) {
        playSound('error');
        toast.error(t('no_stock_available') || "Shortage: No available stock for this item in this warehouse.");
        setScanError(t('no_stock_available') || "Shortage: No available stock.");
        throw new Error('NoStock');
      }

      // If exactly one valid, non-expired lot exists and covers the full requested quantity, allocate automatically
      if (validLots.length === 1 && validLots[0].qtyAvailable >= targetQty) {
        const allocation = [{
          lotId: validLots[0].id,
          lotNumber: validLots[0].lotNumber,
          expiryDate: validLots[0].expiryDate,
          allocatedQty: targetQty,
          overrideReason: null
        }];

        setLines(prev => {
          const existing = prev.find(l => l.item.id === item.id);
          if (existing) {
            return prev.map(l => l.item.id === item.id ? { ...l, qty: targetQty, lotAllocations: allocation } : l);
          }
          return [...prev, {
            id: `new-${Date.now()}`,
            item: {
              id: item.id,
              code: item.code,
              name: item.name || (locale === 'ar' ? item.nameAr : item.nameEn) || '',
              nameAr: item.nameAr,
              nameEn: item.nameEn,
              primaryUom: { code: item.primaryUom.code }
            },
            qty: targetQty,
            uomId: item.primaryUom.id,
            lotAllocations: allocation
          }];
        });

        audioAlerts.playScanSuccess();
        playSound('success');
        toast.success(t('allocated_successfully') || "FEFO auto-allocated successfully.");
      } else {
        // Partial shortage warning
        if (totalAvailable < targetQty) {
          toast.warning(t('shortage_warning') || `Shortage: Only ${totalAvailable} available, but ${targetQty} requested.`);
        }

        let lineToActivate: LineItem;
        if (existingLine) {
          lineToActivate = { ...existingLine, qty: targetQty };
          setLines(prev => prev.map(l => l.id === existingLine.id ? lineToActivate : l));
        } else {
          lineToActivate = {
            id: `new-${Date.now()}`,
            item: {
              id: item.id,
              code: item.code,
              name: item.name || (locale === 'ar' ? item.nameAr : item.nameEn) || '',
              nameAr: item.nameAr,
              nameEn: item.nameEn,
              primaryUom: { code: item.primaryUom.code }
            },
            qty: targetQty,
            uomId: item.primaryUom.id,
            lotAllocations: []
          };
          setLines(prev => [...prev, lineToActivate]);
        }

        setActiveLine(lineToActivate);
        setFefoOpen(true);
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      setScanError(t('no_item_found'));
      throw err;
    }
  };

  const removeLine = (lineId: string) => {
    setLines(prev => prev.filter(l => l.id !== lineId));
  };

  const handleLotClick = (line: LineItem) => {
    setActiveLine(line);
    setFefoOpen(true);
  };

  const handleCloseFEFO = () => {
    setFefoOpen(false);
    if (activeLine && activeLine.id.startsWith('new-')) {
      const currentLine = lines.find(l => l.id === activeLine.id);
      const hasAllocations = (currentLine?.lotAllocations && currentLine.lotAllocations.length > 0);
      if (!hasAllocations) {
        setLines(prev => prev.filter(l => l.id !== activeLine.id));
      }
    }
    setActiveLine(null);
  };

  const handleSubmitIssue = async () => {
    if (!issue) return;
    try {
      await submitIssue.mutateAsync({ id, version: issue.version, signal: abortController.signal });
      setIsSubmitted(true);
      toast.success(t('submit_success') || 'Issue submitted successfully');
    } catch (err: unknown) {
      const apiErr = err as { code?: string; name?: string };
      if (apiErr?.name === 'AbortError') return;
      toast.error(t('submit_error') || 'Failed to submit issue');
    }
  };

  const handleCancelIssue = async () => {
    if (!issue) return;
    if (!window.confirm(t('confirm_cancel') || 'Are you sure you want to delete/cancel this draft?')) return;
    try {
      await cancelIssue.mutateAsync({ id, version: issue.version, signal: abortController.signal });
      toast.success(t('cancel_success') || 'Issue cancelled successfully');
      guardedRouter.push('/issues', { skipGuard: true });
    } catch (err: unknown) {
      const apiErr = err as { code?: string; name?: string };
      if (apiErr?.name === 'AbortError') return;
      toast.error(t('cancel_error') || 'Failed to cancel issue');
    }
  };

  const handlePost = async () => {
    if (!issue) return;
    try {
      await postIssue.mutateAsync({
        id,
        confirmation: 'ACKNOWLEDGE_IRREVERSIBLE',
        version: issue.version,
        signal: abortController.signal,
        headers: {
          'X-Idempotency-Key': idempotencyKey
        }
      });
      setIsPostDialogOpen(false);
      guardedRouter.push('/issues', { skipGuard: true });
    } catch (err: unknown) {
      const apiErr = err as { code?: string; name?: string };
      if (apiErr?.name === 'AbortError') return;
      if (apiErr?.code === 'WAREHOUSE_LOCKED') {
        setIsWarehouseLockedError(true);
        setIsPostDialogOpen(false);
      }
    }
  };

  const history = useMemo((): StatusTimelineEntry[] => {
    if (!issue) return [];

    const issueAny = issue as unknown as Record<string, unknown>;
    const cachedTimeline = issueAny.timeline as StatusTimelineEntry[] | undefined;
    if (cachedTimeline && cachedTimeline.length > 0) {
      return cachedTimeline;
    }

    const h: StatusTimelineEntry[] = [
      { status: ISSUE_STATUS.DRAFT.toLowerCase() as Status, at: issue.createdAt ?? '', by: issue.createdBy ?? 'System' }
    ];
    if (issue.postedAt) {
      h.push({ status: ISSUE_STATUS.POSTED.toLowerCase() as Status, at: issue.postedAt, by: issue.postedBy != null ? issue.postedBy : 'System' });
    }
    return h;
  }, [issue]);

  return (
    <div className="flex-1 w-full bg-card border border-border shadow-sm flex flex-col animate-in fade-in duration-200">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 w-full pb-6">
        <DocumentLockBanner isLocked={isDocLocked} status={status} />
        {isWarehouseLocked && <div className="px-6 lg:px-10 pt-4"><LockBanner lockState={lockState} /></div>}

        <DocumentLockWrapper isLocked={effectiveIsLocked} className="flex-1 flex flex-col">
          <div className="flex-1 w-full min-h-[calc(100vh-280px)] bg-card border border-border shadow-sm rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              {/* Left side (Table) */}
              <div className="lg:col-span-2 flex flex-col gap-6 w-full">
                <div className="flex items-center gap-6 mb-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => guardedRouter.back()}
                    className="rounded-xl shrink-0 hover:bg-primary/5 transition-colors"
                  >
                    <ArrowLeft className={cn("w-5 h-5 text-primary", locale === 'ar' && "rotate-180")} />
                  </Button>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-extrabold text-foreground tracking-tight uppercase">
                        {isNew ? t('create_new') : t('detail_title')}
                      </h1>
                      {!isNew && (
                        <div className="px-2 py-0.5 bg-primary/10 rounded-xl flex items-center gap-1.5">
                          <span className="text-label-xxs font-semibold uppercase text-primary leading-none">
                            {issue?.documentNumber || '—'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {!isDocLocked && (
                  <div className="bg-card border border-border shadow-sm p-4 sm:p-6 md:p-8 rounded-2xl shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
                    <div className="relative space-y-4 sm:space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{t('scan_and_add')}</h3>
                      </div>
                      <ScanInput
                        onScan={handleScan}
                        disabled={effectiveIsLocked || fefoOpen}
                        placeholder={t('scan_placeholder')}
                        onError={(bc) => {
                          audioAlerts.playScanInvalid();
                          setScanError(t('not_found_prefix') + bc);
                        }}
                        size="lg"
                        scannerMode={true}
                        items={items}
                      />

                      {scanError && (
                        <div className="flex items-center gap-3 p-4 bg-red-500/5 rounded-xl text-label-xs font-bold text-red-500 uppercase animate-in shake duration-200">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span className="break-words">{scanError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 sm:p-6 md:p-8 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-1 h-6 bg-primary/20 rounded-full" />
                      <h3 className="text-label-xs font-semibold uppercase text-primary/30">{t('line_items')}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      {!isNew && !effectiveIsLocked && (
                        <Button
                          type="button"
                          onClick={() => guardedRouter.push(`/issues/${id}/scan-mode`)}
                          variant="outline"
                          className="h-10 px-6 text-label-xs font-semibold uppercase rounded-lg border-primary/20 text-primary hover:bg-primary/5 transition-all flex items-center gap-2"
                        >
                          <Scan className="w-4 h-4" />
                          {t('scan_mode.breadcrumb_scan')}
                        </Button>
                      )}
                      <div className="px-4 py-2 bg-card border border-border shadow-sm rounded-xl text-label-xs font-mono text-primary/40">
                        {lines.length} {t('entries').toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <DocumentLineItemTable
                    lines={lines}
                    locale={locale as 'ar' | 'en'}
                    isReadOnly={isDocLocked}
                    onRemoveLine={removeLine}
                    dense={true}
                    hideUomColumn={true}
                    extraColumns={[
                      {
                        header: t('qty'),
                        cell: (line) => (
                          <div className="flex items-center justify-center w-full">
                            <Input
                              type="number"
                              disabled={effectiveIsLocked}
                              className="w-16 md:w-20 h-7 rounded-sm border border-gray-600 bg-transparent text-center px-2 py-0.5 font-mono text-xs outline-none transition-all disabled:opacity-50 text-white focus:ring-1 focus:ring-primary focus:border-primary shadow-none"
                              value={line.qty as number}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setLines(prev => prev.map(l => l.id === line.id ? { ...l, qty: val } : l));
                              }}
                            />
                          </div>
                        )
                      },
                      {
                        header: t('allocate'),
                        cell: (line: LineItem) => {
                          const lineAllocations = line.lotAllocations || [];
                          const totalAllocated = lineAllocations.reduce((sum: number, a: LotAllocation) => sum + a.allocatedQty, 0);
                          const isFullyAllocated = totalAllocated >= line.qty;

                          if (effectiveIsLocked) {
                            return (
                              <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                {lineAllocations.map((alloc: LotAllocation, idx: number) => (
                                  <div key={idx} className="px-2.5 py-1 bg-emerald-500/10 rounded-xl flex items-center gap-1.5">
                                    <span className="text-label-xxs font-mono text-emerald-500/80">{alloc.lotNumber}</span>
                                    <div className="w-1 h-1 rounded-full bg-emerald-500/30" />
                                    <span className="text-label-xxs font-semibold text-emerald-500">{alloc.allocatedQty}</span>
                                  </div>
                                ))}
                                {lineAllocations.length === 0 && (
                                  <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">—</span>
                                )}
                              </div>
                            );
                          }

                          return (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-2.5 text-[10px] font-bold uppercase rounded-sm border transition-all ${isFullyAllocated ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20' : 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20'}`}
                              onClick={() => handleLotClick(line)}
                            >
                              {lineAllocations.length > 0
                                ? <div className="flex items-center gap-1.5" dir="ltr">
                                  <span>{totalAllocated}</span>
                                  <div className="w-1 h-1 rounded-full bg-current/30" />
                                  <span>{line.qty}</span>
                                </div>
                                : t('allocate')}
                            </Button>
                          );
                        }
                      }
                    ]}
                  />
                </div>
              </div>

              {/* Right side (Sidebar) */}
              <div className="h-fit flex flex-col gap-6">
                <div className="bg-card border border-border shadow-sm p-4 sm:p-6 md:p-8 rounded-2xl shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
                  <div className="relative space-y-6 sm:space-y-10">
                    <div className="flex items-center gap-4 pb-4 sm:pb-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{t('document_manifest')}</h3>
                        <p className="text-label-xs text-primary/20 font-bold">{t('operational_parameters')}</p>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-12 space-y-6 sm:space-y-8">
                      <div className="space-y-3 group">
                        <div className="flex items-center gap-2">
                          <ArrowRight className={cn("w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity shrink-0", locale === 'ar' ? "rotate-180" : "")} />
                          <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('destination')}</label>
                        </div>
                        <SmartCombobox
                          items={departments.map((dept) => ({
                            id: dept.id,
                            name: dept.name || '',
                            name_en: dept.name || '',
                            name_ar: dept.name || '',
                          }))}
                          value={destinationId}
                          onSelect={(item: ComboboxItem) => setDestinationId(item.id as string)}
                          disabled={effectiveIsLocked}
                          placeholder={t('select_department')}
                          triggerClassName="w-full h-12 bg-surface-container-highest border-none rounded-xl px-4 font-bold text-label-sm transition-all shadow-none focus:ring-1 focus:ring-primary-fixed-dim/10"
                        />
                      </div>

                      <div className="space-y-3 group">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-cyan-500/50 shrink-0" />
                          <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('requested_by')}</label>
                        </div>
                        <Input
                          type="text"
                          value={requestedBy}
                          onChange={e => setRequestedBy(e.target.value)}
                          disabled={effectiveIsLocked}
                          placeholder={t('requested_by_placeholder')}
                          className="w-full h-12 bg-surface-container-highest border-none rounded-xl px-4 font-bold text-label-sm transition-all placeholder:text-muted-foreground/20 shadow-none focus-visible:ring-1 focus-visible:ring-primary-fixed-dim/10"
                        />
                      </div>

                      <div className="space-y-3 group pt-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-cyan-500/50 shrink-0" />
                          <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('operational_notes')}</label>
                        </div>
                        <Textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          disabled={effectiveIsLocked}
                          placeholder={t('notes_placeholder')}
                          className="w-full bg-surface-container-highest border-none rounded-xl p-5 text-label-sm font-medium transition-all min-h-[140px] resize-none placeholder:text-muted-foreground/20 leading-relaxed shadow-none focus-visible:ring-1 focus-visible:ring-primary-fixed-dim/10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border shadow-sm p-4 sm:p-6 md:p-8 rounded-2xl shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
                  <div className="flex items-center gap-4 mb-6 sm:mb-8">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <History className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{t('status_history')}</h4>
                  </div>

                  <div className="relative ps-2">
                    <StatusTimeline entries={history} />
                  </div>

                  {!isNew && (
                    <div className="mt-10 pt-8 space-y-4">
                      <div className="flex justify-between items-center group">
                        <span className="text-label-xs text-primary/20 font-semibold uppercase">{t('created_by')}</span>
                        <div className="px-3 py-1 bg-card border border-border shadow-sm rounded-xl transition-colors group-hover:bg-primary/5">
                          <span className="text-label-xs font-mono font-semibold text-primary/60 group-hover:text-primary transition-colors" dir="ltr">{user?.name || 'System'}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center group">
                        <span className="text-label-xs text-primary/20 font-semibold uppercase">{t('created_at')}</span>
                        <div className="px-3 py-1 bg-card border border-border shadow-sm rounded-xl transition-colors group-hover:bg-primary/5">
                          <span className="text-label-xs font-mono font-semibold text-primary/60 group-hover:text-primary transition-colors" dir="ltr">
                            {formatDate(issue?.createdAt, locale as 'ar' | 'en')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DocumentLockWrapper>

        <FormFooter
          isLocked={effectiveIsLocked}
          onCancel={() => guardedRouter.push('/issues')}
          onSubmit={() => setIsPostDialogOpen(true)}
          isPending={isPostPending}
          submitLabel={t('post_issue')}
          canSubmit={lines.length > 0 && !!destinationId}
          actions={
            <>
              {effectiveIsLocked && (
                <VoidButton
                  documentId={id}
                  documentType="ISSUE"
                  status={status}
                  version={issue?.version || 1}
                />
              )}
              {!effectiveIsLocked && !isNew && status === ISSUE_STATUS.DRAFT && (
                <Button
                  type="button"
                  onClick={handleSubmitIssue}
                  disabled={submitIssue.isPending}
                  className="w-full md:w-auto flex items-center justify-center h-8 md:h-10 px-4 md:px-6 rounded-full transition-all bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] md:text-label-sm font-black uppercase tracking-widest shadow-sm shadow-cyan-900/30 active:scale-95 gap-2 shrink-0 border-none"
                >
                  {submitIssue.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                  <span>{submitIssue.isPending ? t('submitting') || 'Submitting...' : t('submit') || 'Submit'}</span>
                </Button>
              )}
              {!effectiveIsLocked && !isNew && status === ISSUE_STATUS.DRAFT && (
                <Button
                  type="button"
                  onClick={handleCancelIssue}
                  disabled={cancelIssue.isPending}
                  variant="destructive"
                  className="h-8 md:h-10 px-4 md:px-6 rounded-full transition-all text-[10px] md:text-label-sm font-black uppercase tracking-widest active:scale-95 flex items-center gap-2 shrink-0 border-none shadow-sm shadow-red-900/30"
                >
                  {cancelIssue.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                  <span>{t('cancel') || 'Delete'}</span>
                </Button>
              )}
              {!effectiveIsLocked && !isNew && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => guardedRouter.push(`/issues/${id}/scan-mode`)}
                  className="h-8 md:h-10 px-3 md:px-5 rounded-full text-[10px] md:text-label-sm font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-card/5 transition-all group flex items-center gap-2 shrink-0 border-none"
                >
                  <Scan className="w-4 h-4 md:w-5 md:h-5 opacity-50 transition-transform group-hover:scale-110" />
                  <span className="hidden md:inline">{t('scan_mode.breadcrumb_scan')}</span>
                </Button>
              )}
            </>
          }
        />
      </form>

      <PostConfirmDialog
        open={isPostDialogOpen}
        onOpenChange={setIsPostDialogOpen}
        title={t('post_confirm_title')}
        description={t('post_confirm_desc')}
        warningText=""
        requiresTextConfirmation={true}
        onConfirm={handlePost}
        isLoading={isPostPending}
      />

      <Dialog open={fefoOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseFEFO();
        } else {
          setFefoOpen(true);
        }
      }}>
        <DialogContent className="max-h-[85vh] max-w-2xl bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="p-8 bg-primary/[0.02]">
            <DialogHeader>
              <DialogTitle className="text-title-lg font-semibold uppercase italic text-foreground">
                {t('fefo_drawer_title')}: <span className="text-primary font-mono">{activeLine?.item.name || (locale === 'ar' ? activeLine?.item.nameAr : activeLine?.item.nameEn)}</span>
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-8">
            {activeLine && (
              <FEFOLotAllocator
                lots={lots}
                requestedQty={activeLine.qty}
                uomLabel={activeLine.item.primaryUom?.code || activeLine.uomId || ''}
                userRole={user?.role}
                onAllocate={(allocations) => {
                  setLines(prev => prev.map(l => l.id === activeLine.id ? {
                    ...l, lotAllocations: allocations
                  } : l));
                  setFefoOpen(false);
                  setActiveLine(null);
                }}
                onClose={handleCloseFEFO}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
