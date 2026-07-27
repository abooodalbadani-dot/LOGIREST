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
import { isDocumentLocked, canPerformActionV2, getConversionFactor, toBaseQty, type DocumentStatus } from '@logirest/shared-types';
import { resolveUomCode } from '@/utils/uom-helper';
import { useAuth } from '@/providers/AuthProvider';
import type { LotAllocation, StockIssue, IssueLineItem } from '@/types/documents';
import { StatusTimeline, type StatusTimelineEntry, type Status } from '@/components/shared/StatusTimeline';
import { cn } from '@/lib/utils';
import { ISSUE_STATUS } from '@logirest/shared-types';
import { useAbortController } from '@/hooks/useAbortController';
import { isItemBatchTracked } from '@/types/master-data';
import { useUoMs } from '@/features/uoms/hooks/useUoMs';
import { SmartCombobox, type ComboboxItem } from '@/components/shared/SmartCombobox';

import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useWarehouseInventory } from '@/features/inventory/hooks/useWarehouseInventory';
import { RelationalName } from '@/components/shared/RelationalName';

interface IssueFormProps {
  issue?: StockIssue;
  id: string;
  isNew: boolean;
  onConflict?: () => void;
}

/** Extended line state that carries UOM conversion data for the UOM combobox */
interface IssueLine extends LineItem {
  /** Base-UOM quantity — always sent to the API */
  baseQty: number;
  /** UOM conversions fetched from item API (fromUomId, toUomId, factor) */
  uomConversions: Array<{ fromUomId: string; toUomId: string; factor: number }>;
  /** The item's base (primary) UOM id */
  baseUomId: string;
}

export function IssueForm({ issue, id, isNew, onConflict }: IssueFormProps) {
  const t = useTranslations('operations.issue');
  const locale = useLocale();
  const { user, activeScope } = useAuth();
  const abortController = useAbortController();
  const toLineItem = (l: IssueLineItem): LineItem => {
    const firstAlloc = l.lotAllocations?.[0];
    const lot = l.lot
      ? { lotNumber: l.lot.lotNumber, expiryDate: l.lot.expiryDate }
      : firstAlloc
      ? { lotNumber: firstAlloc.lotNumber, expiryDate: firstAlloc.expiryDate || null }
      : null;

    return {
      id: l.id,
      item: {
        id: l.item.id,
        code: l.item.code,
        name: l.item.name,
        image: l.item.image || null,
        primaryUom: { id: l.item.primaryUom?.id || l.uomId || '', code: l.item.primaryUom?.code || l.uomId || '' },
      },
      lot,
      qty: l.qty,
      uomId: l.uomId,
      lotAllocations: l.lotAllocations,
    };
  };

  const [warehouseId] = useState(() => issue?.warehouseId || activeScope.warehouseId || '');
  const [lines, setLines] = useState<IssueLine[]>(() =>
    (issue?.lines || []).map((l): IssueLine => ({
      ...toLineItem(l),
      baseQty: l.qty,
      uomConversions: [],
      baseUomId: l.uomId || '',
    }))
  );
  const [destinationId, setDestinationId] = useState(() => issue?.destinationDeptId ?? '');
  const [notes, setNotes] = useState(() => issue?.notes || '');
  const [scanError, setScanError] = useState('');
  const [requestedBy, setRequestedBy] = useState(() => issue?.requestedBy ?? '');

  const postIssue = usePostIssue({ onConflict });
  const isPostPending = postIssue.isPending;
  const submitIssue = useSubmitIssue({ onConflict });
  const cancelIssue = useCancelIssue({ onConflict });
  const { playSound } = useAudioFeedback();
  const { data: uomsResult } = useUoMs();
  const uoms = uomsResult?.data || [];

  const { data: inventoryData } = useWarehouseInventory(warehouseId, { enabled: !!warehouseId });
  const inventoryItems = inventoryData?.data || [];

  const items = useMemo(() => {
    return inventoryItems
      .filter((inv) => inv.qtyAvailable > 0)
      .map((inv) => ({
        id: inv.itemId,
        code: inv.itemCode,
        barcode: inv.itemCode,
        name: inv.itemName,
        qtyAvailable: inv.qtyAvailable,
        uomCode: inv.uomCode,
      }));
  }, [inventoryItems]);

  const lastResetId = useRef<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (issue && issue.id !== lastResetId.current) {
      lastResetId.current = issue.id;
      setLines(
        (issue.lines || []).map((l): IssueLine => ({
          ...toLineItem(l),
          baseQty: l.qty,
          uomConversions: [],
          baseUomId: l.uomId || '',
        }))
      );
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

  const userRole = user?.role;
  const canPost = userRole ? canPerformActionV2('ISSUE', status, 'POST', userRole) : false;
  const canSubmit = userRole ? canPerformActionV2('ISSUE', status, 'SUBMIT', userRole) : false;
  const primaryAction = canPost ? 'POST' : canSubmit ? 'SUBMIT' : null;

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
          }),
          uomConversions: z.array(z.object({
            fromUomId: z.string(),
            toUomId: z.string(),
            factor: z.coerce.number(),
          })).optional().default([]),
        }))
      });
      const clean = barcode.trim();
      let res = await apiClient.get(`/items?search=${encodeURIComponent(clean)}`, ItemSchema, { signal: abortController.signal });
      if (!res.data || res.data.length === 0) {
        res = await apiClient.get(`/items?barcode=${encodeURIComponent(clean)}`, ItemSchema, { signal: abortController.signal });
      }

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
          itemId: z.string().optional(),
          item_id: z.string().optional(),
          lotNumber: z.string().optional(),
          lot_number: z.string().optional(),
          expiryDate: z.string().nullable().optional(),
          expiry_date: z.string().nullable().optional(),
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
        itemId: lotItem.itemId || lotItem.item_id || item.id,
        warehouseId: warehouseId,
        lotNumber: lotItem.lotNumber || lotItem.lot_number || lotItem.id,
        expiryDate: lotItem.expiryDate || lotItem.expiry_date || null,
        qtyAvailable: lotItem.totalQty ?? lotItem.qtyAvailable ?? 0,
        isExpired: lotItem.isExpired ?? false,
        isNearExpiry: lotItem.isNearExpiry ?? false,
      }));

      const validLots = availableLots
        .filter(l => !l.isExpired && l.qtyAvailable > 0)
        .sort((a, b) => new Date(a.expiryDate || 0).getTime() - new Date(b.expiryDate || 0).getTime());

      const existingLine = lines.find(l => l.item.id === item.id);
      const targetQty = existingLine ? existingLine.qty + 1 : 1;
      const totalAvailable = validLots.reduce((sum, lot) => sum + lot.qtyAvailable, 0);

      if (totalAvailable <= 0) {
        playSound('error');
        const noStockMsg = t.has('no_stock_available') ? t('no_stock_available') : "Shortage: No available stock for this item in this warehouse.";
        toast.error(noStockMsg);
        setScanError(noStockMsg);
        throw new Error('NoStock');
      }

      // If exactly one valid, non-expired lot exists and covers the full requested quantity, allocate automatically
      if (validLots.length === 1 && validLots[0].qtyAvailable >= targetQty) {
        const allocation = [{
          lotId: validLots[0].id,
          lotNumber: validLots[0].lotNumber || validLots[0].id,
          expiryDate: validLots[0].expiryDate || null,
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
              primaryUom: { id: item.primaryUom.id, code: item.primaryUom.code }
            },
            qty: targetQty,
            baseQty: targetQty,
            uomId: item.primaryUom.id,
            baseUomId: item.primaryUom.id,
            uomConversions: item.uomConversions ?? [],
            lotAllocations: allocation
          } as IssueLine];
        });

        audioAlerts.playScanSuccess();
        playSound('success');
        const successMsg = t.has('allocated_successfully') ? t('allocated_successfully') : "FEFO auto-allocated successfully.";
        toast.success(successMsg);
      } else {
        // Partial shortage warning
        if (totalAvailable < targetQty) {
          const shortageMsg = t.has('shortage_warning') ? t('shortage_warning') : `Shortage: Only ${totalAvailable} available, but ${targetQty} requested.`;
          toast.warning(shortageMsg);
        }

        let lineToActivate: IssueLine;
        if (existingLine) {
          lineToActivate = { ...existingLine, qty: targetQty } as IssueLine;
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
              primaryUom: { id: item.primaryUom.id, code: item.primaryUom.code }
            },
            qty: targetQty,
            baseQty: targetQty,
            uomId: item.primaryUom.id,
            baseUomId: item.primaryUom.id,
            uomConversions: item.uomConversions ?? [],
            lotAllocations: []
          } as IssueLine;
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
    setLines(prev => prev.filter(l => l.id !== lineId) as IssueLine[]);
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
        setLines(prev => prev.filter(l => l.id !== activeLine.id) as IssueLine[]);
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
    <div className="flex-1 w-full sm:bg-card sm:border sm:border-border sm:shadow-sm flex flex-col animate-in fade-in duration-200">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 w-full pb-6">
        <DocumentLockBanner isLocked={isDocLocked} status={status} />
        {isWarehouseLocked && <div className="px-6 lg:px-10 pt-4"><LockBanner lockState={lockState} /></div>}

        <DocumentLockWrapper isLocked={effectiveIsLocked} className="flex-1 flex flex-col">
          <div className="flex-1 w-full min-h-[calc(100vh-280px)] mb-6 flex flex-col gap-6">
            {/* Title Header */}
            <div className="flex items-center gap-6 mb-2 px-4 sm:px-0">
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

            {/* Document Manifest - Compact Style */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 bg-card border-y border-x-0 sm:border border-border shadow-sm px-4 py-5 sm:p-6 rounded-none sm:rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500/50 via-cyan-500/20 to-transparent" />

              <div className="col-span-1 flex flex-col gap-1 px-3 py-2.5 rounded-xl bg-surface-container-highest/20">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 ms-0.5">{t('destination')}</label>
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
                  triggerClassName="w-full h-10 bg-card border border-border/50 rounded-lg px-3 font-bold text-sm transition-all shadow-sm focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="col-span-1 flex flex-col gap-1 px-3 py-2.5 rounded-xl bg-surface-container-highest/20">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 ms-0.5">{t('requested_by')}</label>
                <Input
                  type="text"
                  value={requestedBy}
                  onChange={e => setRequestedBy(e.target.value)}
                  disabled={effectiveIsLocked}
                  placeholder={t('requested_by_placeholder')}
                  className="w-full h-10 bg-card border border-border/50 rounded-lg px-3 font-bold text-sm transition-all shadow-sm focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="col-span-2 md:col-span-4 flex flex-col gap-1 px-3 py-2.5 rounded-xl bg-surface-container-highest/20">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 ms-0.5">{t('operational_notes')}</label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  disabled={effectiveIsLocked}
                  placeholder={t('notes_placeholder')}
                  className="w-full min-h-[60px] bg-card border border-border/50 rounded-lg px-3 py-2 font-bold text-sm transition-all shadow-sm focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            {/* Scan Box */}
            {!isDocLocked && (
              <div className="bg-card border-y border-x-0 sm:border border-border shadow-sm px-4 py-6 sm:p-6 rounded-none sm:rounded-2xl relative overflow-hidden group transition-all hover:shadow-md">
                <div className="relative space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{t('scan_and_add')}</h3>
                  </div>
                  <ScanInput
                    onScan={handleScan}
                    disabled={effectiveIsLocked || fefoOpen || !warehouseId}
                    placeholder={!warehouseId ? (locale === 'ar' ? 'يرجى تحديد المستودع أولاً...' : 'Please select a Warehouse first...') : t('scan_placeholder')}
                    onError={(bc) => {
                      audioAlerts.playScanInvalid();
                      setScanError(t('not_found_prefix') + bc);
                    }}
                    size="lg"
                    scannerMode={true}
                    items={items}
                    getPrimaryLabel={(item) => typeof item.name === 'string' ? item.name : ''}
                    getSecondaryLabel={(item) => {
                      const availText = locale === 'ar' ? 'المتاح' : 'Available';
                      const qty = typeof item.qtyAvailable === 'number' ? item.qtyAvailable : 0;
                      const uom = typeof item.uomCode === 'string' ? item.uomCode : '';
                      return `${item.code || ''} | ${availText}: ${qty} ${uom}`;
                    }}
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

            {/* Table */}
            <div className="bg-card border-y border-x-0 sm:border border-border shadow-sm rounded-none sm:rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 sm:p-6 md:p-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-1 h-6 bg-primary/20 rounded-full" />
                  <h3 className="text-label-xs font-semibold uppercase text-primary/30">{t('line_items')}</h3>
                </div>
                <div className="flex items-center gap-3">
                  {!isNew && !effectiveIsLocked && (
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        guardedRouter.push(`/issues/${id}/scan-mode`, { skipGuard: true });
                      }}
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
                noCollapse={false}
                mobileLayoutPattern="issue-form"
                renderUom={(line) => {
                  const issueLine = line as IssueLine;
                  const uomOptions = [
                    // Always include primary UOM
                    ...(issueLine.baseUomId ? [{
                      id: issueLine.baseUomId,
                      name: issueLine.item.primaryUom?.code || issueLine.baseUomId,
                    }] : []),
                    // Add alternate UOMs from conversions
                    ...uoms
                      .filter(u => u.id !== issueLine.baseUomId &&
                        issueLine.uomConversions.some(c => c.fromUomId === u.id || c.toUomId === u.id)
                      )
                      .map(u => ({ id: u.id, name: u.code || u.name })),
                  ];

                  const resolvedCode = resolveUomCode(issueLine.uomId, issueLine.item, uoms);

                  if (uomOptions.length <= 1 || isDocLocked) {
                    return (
                      <span className="text-label-xs font-bold uppercase text-muted-foreground px-2 py-0.5 bg-surface-container rounded-lg font-mono">
                        {resolvedCode}
                      </span>
                    );
                  }

                  return (
                    <SmartCombobox
                      items={uomOptions}
                      value={issueLine.uomId}
                      onSelect={(uom) => {
                        const factor = getConversionFactor(
                          uom.id,
                          issueLine.baseUomId,
                          issueLine.uomConversions,
                        );
                        const currentBaseQty = issueLine.baseQty ?? issueLine.qty;
                        const newDisplayQty = parseFloat((currentBaseQty / factor).toFixed(4));
                        setLines(prev => prev.map(l =>
                          l.id === line.id
                            ? { ...l, uomId: uom.id, qty: newDisplayQty, baseQty: currentBaseQty } as IssueLine
                            : l
                        ));
                      }}
                      placeholder={issueLine.item.primaryUom?.code || 'UOM'}
                      triggerClassName="h-9 px-2 text-xs border border-border/70 bg-surface-container-highest/30 text-foreground text-center rounded-lg w-full font-semibold shadow-sm focus-visible:ring-brand-gold transition-all"
                    />
                  );
                }}
                extraColumns={[
                  {
                    header: t('allocate'),
                    cell: (line: LineItem) => {
                      const isTracked = isItemBatchTracked(line.item);
                      if (!isTracked) {
                        return (
                          <div className="flex justify-center w-full">
                            <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">—</span>
                          </div>
                        );
                      }
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

            {/* Status History */}
            <div className="bg-card border-y border-x-0 sm:border border-border shadow-sm px-4 py-6 sm:p-8 rounded-none sm:rounded-2xl relative overflow-hidden group transition-all hover:shadow-md">
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
        </DocumentLockWrapper>

        <FormFooter
          isLocked={effectiveIsLocked && primaryAction === null}
          onCancel={() => guardedRouter.push('/issues')}
          onSubmit={primaryAction === 'POST' ? () => setIsPostDialogOpen(true) : handleSubmitIssue}
          isPending={primaryAction === 'POST' ? isPostPending : submitIssue.isPending}
          submitLabel={primaryAction === 'POST' ? t('post_issue') : t('submit_for_approval')}
          canSubmit={primaryAction !== null && lines.length > 0 && !!destinationId}
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
        <DialogContent className="max-h-[85vh] max-w-2xl bg-white dark:bg-card border border-gray-200 dark:border-gray-800 shadow-2xl rounded-2xl p-0 overflow-hidden">
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
