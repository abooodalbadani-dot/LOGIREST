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
import { FormFooter } from '@/components/shared/FormFooter';
import { usePostIssue } from '@/features/operations/hooks/usePostIssue';
import { useSubmitIssue } from '@/features/operations/hooks/useSubmitIssue';
import { LockBanner } from '@/components/shared/LockBanner';
import { toast } from 'sonner';
import { audioAlerts } from '@/utils/audio';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { VoidButton } from '@/components/shared/VoidButton';

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

interface IssueFormProps {
  issue?: StockIssue;
  id: string;
  isNew: boolean;
  onConflict?: () => void;
}

export function IssueForm({ issue, id, isNew, onConflict }: IssueFormProps) {
  const t = useTranslations('operations.issue');
  const locale = useLocale();
  const { user } = useAuth();
  const abortController = useAbortController();
  
  const postIssue = usePostIssue({ onConflict });
  const isPostPending = postIssue.isPending;
  const submitIssue = useSubmitIssue({ onConflict });
  const { playSound } = useAudioFeedback();

  const { data: itemsData } = useItems(); const items = itemsData?.data || [];

  const toLineItem = (l: IssueLineItem): LineItem => ({
    id: l.id,
    item: {
      id: l.item.id,
      code: l.item.code,
      name_ar: l.item.name_ar,
      name_en: l.item.name_en,
      primary_uom: { code: l.item.primary_uom.code },
    },
    lot: l.lot ? { lot_number: l.lot.lot_number, expiry_date: l.lot.expiry_date } : null,
    qty: l.qty,
    uom_id: l.uom_id,
    lot_allocations: l.lot_allocations,
  });

  const [lines, setLines] = useState<LineItem[]>(() => (issue?.lines || []).map(toLineItem));
  const [destinationId, setDestinationId] = useState(() => issue?.destination_dept_id ?? '');
  const [warehouseId] = useState(() => issue?.warehouse_id || 'wh-1');
  const [notes, setNotes] = useState(() => issue?.notes || '');
  const [scanError, setScanError] = useState('');
  const [requestedBy, setRequestedBy] = useState(() => issue?.requested_by ?? '');

  const lastResetId = useRef<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (issue && issue.id !== lastResetId.current) {
      lastResetId.current = issue.id;
      setLines((issue.lines || []).map(toLineItem));
      setDestinationId(issue.destination_dept_id ?? '');
      setNotes(issue.notes || '');
      setRequestedBy(issue.requested_by ?? '');
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
    const destChanged = destinationId !== (issue?.destination_dept_id ?? '');
    const notesChanged = notes !== (issue?.notes || '');
    const reqByChanged = requestedBy !== (issue?.requested_by ?? '');
    
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
    item_id: activeLine?.item?.id || '', 
    warehouse_id: warehouseId 
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
      setScanError('');
      const ItemSchema = z.object({
        data: z.array(z.object({
          id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
          primary_uom: z.object({ id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string() })
        }))
      });
      const res = await apiClient.get(`/master-data/items?barcode=${barcode}`, ItemSchema, { signal: abortController.signal });
      if (!res.data || res.data.length === 0) {
        audioAlerts.playScanInvalid();
        setScanError(t('no_item_found'));
        playSound('error');
        toast.error(t('no_item_found'));
        return;
      }
      
      const item = res.data[0];

      // Query available lots for the item
      const LotsResponseSchema = z.object({
        data: z.array(z.object({
          id: z.string(),
          item_id: z.string(),
          lot_number: z.string(),
          expiry_date: z.string(),
          total_qty: z.number().optional(),
          qty_available: z.number().optional(),
          is_expired: z.boolean().optional(),
          is_near_expiry: z.boolean().optional(),
        }))
      });

      const lotsRes = await apiClient.get(
        `/operations/lots-available?item_id=${item.id}&warehouse_id=${warehouseId}`, 
        LotsResponseSchema, 
        { signal: abortController.signal }
      );

      const availableLots = (lotsRes.data || []).map((lotItem) => ({
        id: lotItem.id,
        item_id: lotItem.item_id,
        warehouse_id: warehouseId,
        lot_number: lotItem.lot_number,
        expiry_date: lotItem.expiry_date,
        qty_available: lotItem.total_qty ?? lotItem.qty_available ?? 0,
        is_expired: lotItem.is_expired ?? false,
        is_near_expiry: lotItem.is_near_expiry ?? false,
      }));

      // Filter non-expired lots with stock and sort by FEFO
      const validLots = availableLots
        .filter(l => !l.is_expired && l.qty_available > 0)
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

      const existingLine = lines.find(l => l.item.id === item.id);
      const targetQty = existingLine ? existingLine.qty + 1 : 1;
      const totalAvailable = validLots.reduce((sum, lot) => sum + lot.qty_available, 0);

      if (totalAvailable <= 0) {
        audioAlerts.playScanInvalid();
        playSound('error');
        toast.error(t('no_stock_available') || "Shortage: No available stock for this item in this warehouse.");
        setScanError(t('no_stock_available') || "Shortage: No available stock.");
        return;
      }

      // If exactly one valid, non-expired lot exists and covers the full requested quantity, allocate automatically
      if (validLots.length === 1 && validLots[0].qty_available >= targetQty) {
        const allocation = [{
          lot_id: validLots[0].id,
          lot_number: validLots[0].lot_number,
          expiry_date: validLots[0].expiry_date,
          allocated_qty: targetQty,
          override_reason: null
        }];

        setLines(prev => {
          const existing = prev.find(l => l.item.id === item.id);
          if (existing) {
            return prev.map(l => l.item.id === item.id ? { ...l, qty: targetQty, lot_allocations: allocation } : l);
          }
          return [...prev, {
            id: `new-${Date.now()}`,
            item,
            qty: targetQty,
            uom_id: item.primary_uom.id,
            lot_allocations: allocation
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
            item,
            qty: targetQty,
            uom_id: item.primary_uom.id,
            lot_allocations: []
          };
          setLines(prev => [...prev, lineToActivate]);
        }

        setActiveLine(lineToActivate);
        setFefoOpen(true);
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      audioAlerts.playScanInvalid();
      setScanError(t('no_item_found'));
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
      const hasAllocations = (currentLine?.lot_allocations && currentLine.lot_allocations.length > 0);
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
      { status: ISSUE_STATUS.DRAFT.toLowerCase() as Status, at: issue.created_at ?? '', by: issue.created_by ?? 'System' }
    ];
    if (issue.posted_at) {
      h.push({ status: ISSUE_STATUS.POSTED.toLowerCase() as Status, at: issue.posted_at, by: issue.posted_by != null ? issue.posted_by : 'System' });
    }
    return h;
  }, [issue]);

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col animate-in fade-in duration-200 pb-32">
      <div className="glass-header sticky top-0 z-50 h-16 px-6 lg:px-10 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
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
              <h1 className="text-title-lg font-semibold uppercase italic text-foreground leading-none">
                {isNew ? t('create_new') : t('detail_title')}
              </h1>
              {!isNew && (
                <div className="px-2 py-0.5 bg-primary/10 rounded-xl flex items-center gap-1.5">
                  <span className="text-label-xxs font-semibold uppercase text-primary leading-none">
                    {issue?.document_number || '—'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <DocumentLockBanner isLocked={isDocLocked} status={status} />
        {isWarehouseLocked && <div className="px-6 lg:px-10 pt-4"><LockBanner lockState={lockState} /></div>}
        
        <DocumentLockWrapper isLocked={effectiveIsLocked}>
          <div className="flex-1 px-6 lg:px-10 py-8">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-8 space-y-8">
                {!isDocLocked && (
                  <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
                    <div className="relative space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
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
                          <AlertCircle className="w-4 h-4" />
                          {scanError}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-8 flex justify-between items-center">
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
                      <div className="px-4 py-2 bg-surface-container-low rounded-xl text-label-xs font-mono text-primary/40">
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
                    extraColumns={[
                      {
                        header: t('qty'),
                        cell: (line) => (
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              dir="ltr"
                              className="w-20 h-8 bg-surface-container-low border-none rounded-sm text-center font-mono text-xs shadow-none focus-visible:ring-1 focus-visible:ring-primary-fixed-dim/10 disabled:opacity-50 transition-all"
                              value={line.qty as number} 
                              disabled={effectiveIsLocked}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setLines(prev => prev.map(l => l.id === line.id ? { ...l, qty: val } : l));
                              }} 
                            />
                            <span className="text-label-xs font-semibold uppercase text-primary/20">{line.item.primary_uom.code}</span>
                          </div>
                        )
                      },
                      {
                        header: t('allocate'),
                        cell: (line: LineItem) => {
                          const lineAllocations = line.lot_allocations || [];
                          const totalAllocated = lineAllocations.reduce((sum: number, a: LotAllocation) => sum + a.allocated_qty, 0);
                          const isFullyAllocated = totalAllocated >= line.qty;
                          
                          if (effectiveIsLocked) {
                            return (
                              <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                {lineAllocations.map((alloc, idx) => (
                                  <div key={idx} className="px-2.5 py-1 bg-emerald-500/10 rounded-xl flex items-center gap-1.5">
                                    <span className="text-label-xxs font-mono text-emerald-500/80">{alloc.lot_number}</span>
                                    <div className="w-1 h-1 rounded-full bg-emerald-500/30" />
                                    <span className="text-label-xxs font-semibold text-emerald-500">{alloc.allocated_qty}</span>
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
                              className={`h-10 px-5 text-label-xs font-semibold uppercase rounded-xl transition-all ${ isFullyAllocated ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-primary/10 text-primary hover:bg-primary/20' }`}
                              onClick={() => handleLotClick(line)}
                            >
                              {lineAllocations.length > 0 
                                ? <div className="flex items-center gap-2" dir="ltr">
                                    <span>{totalAllocated}</span>
                                    <div className="w-1 h-1 rounded-full bg-current/30" />
                                    <span className="opacity-50">{line.qty}</span>
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

              <div className="col-span-12 lg:col-span-4 space-y-8">
                <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
                  <div className="relative space-y-10">
                    <div className="flex items-center gap-4 pb-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{t('document_manifest')}</h3>
                        <p className="text-label-xs text-primary/20 font-bold">{t('operational_parameters')}</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-3 group">
                        <div className="flex items-center gap-2">
                          <ArrowRight className={cn("w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity", locale === 'ar' ? "rotate-180" : "")} />
                          <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('destination')}</label>
                        </div>
                        <SmartCombobox
                          items={departments.map((dept) => ({
                            id: dept.id,
                            name_en: dept.name_en,
                            name_ar: dept.name_ar,
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
                          <User className="w-3 h-3 text-cyan-500/50" />
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
                          <Clock className="w-3 h-3 text-cyan-500/50" />
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

                <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
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
                        <div className="px-3 py-1 bg-surface-container-low rounded-xl transition-colors group-hover:bg-primary/5">
                          <span className="text-label-xs font-mono font-semibold text-primary/60 group-hover:text-primary transition-colors" dir="ltr">{user?.name || 'System'}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center group">
                        <span className="text-label-xs text-primary/20 font-semibold uppercase">{t('created_at')}</span>
                        <div className="px-3 py-1 bg-surface-container-low rounded-xl transition-colors group-hover:bg-primary/5">
                          <span className="text-label-xs font-mono font-semibold text-primary/60 group-hover:text-primary transition-colors" dir="ltr">
                            {formatDate(issue?.created_at, locale as 'ar' | 'en')}
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
                  className="h-8 md:h-10 px-4 md:px-6 rounded-full transition-all bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] md:text-label-sm font-black uppercase tracking-widest shadow-lg shadow-cyan-900/30 active:scale-95 flex items-center gap-2 shrink-0 border-none"
                >
                  {submitIssue.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                  <span>{submitIssue.isPending ? t('submitting') || 'Submitting...' : t('submit') || 'Submit'}</span>
                </Button>
              )}
              {!effectiveIsLocked && !isNew && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => guardedRouter.push(`/issues/${id}/scan-mode`)}
                  className="h-8 md:h-10 px-3 md:px-5 rounded-full text-[10px] md:text-label-sm font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all group flex items-center gap-2 shrink-0 border-none"
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
        <DialogContent className="max-h-[85vh] max-w-2xl bg-surface-container-lowest border-none shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="p-8 bg-primary/[0.02]">
            <DialogHeader>
              <DialogTitle className="text-title-lg font-semibold uppercase italic text-foreground">
                {t('fefo_drawer_title')}: <span className="text-primary font-mono">{locale === 'ar' ? activeLine?.item.name_ar : activeLine?.item.name_en}</span>
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-8">
            {activeLine && (
              <FEFOLotAllocator
                lots={lots}
                requestedQty={activeLine.qty}
                uomLabel={activeLine.item.primary_uom.code}
                userRole={user?.role} 
                onAllocate={(allocations) => {
                  setLines(prev => prev.map(l => l.id === activeLine.id ? {
                    ...l, lot_allocations: allocations
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
