"use client"

import * as React from "react";
import { useStocktake, useUpdateItemCount, useCompleteCounting } from "@/features/operations/api/useStocktakes";
import { useWarehouses } from "@/features/warehouses/hooks/useWarehouses";
import { useTranslations } from "next-intl";
import { useDebouncedCallback } from "use-debounce";
import { useRouter } from "@/i18n/navigation";
import { CheckCircle2, Loader2, SendHorizonal, MoveRight, MoveLeft } from "lucide-react";
import { toast } from "sonner";
import { useUnsavedChangesGuard } from "@/lib/unsaved-changes/useUnsavedChangesGuard";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { mapToSessionVM, StocktakeItemVM } from "@/features/operations/mappers/stocktakeMapper";
import { normalizeDigits } from "@/utils/number";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DocumentLineItemTable } from "@/components/shared/DocumentLineItemTable/DocumentLineItemTable";
import { VirtualizedMobileGrid } from "@/components/shared/VirtualizedMobileGrid";
import { PageHeader } from "@/components/shared/PageHeader";
import { ScanInput } from "@/components/shared/ScanInput/ScanInput";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { ScopeGuard } from "@/components/shared/ScopeGuard";
import { StatusBadge } from "@/components/shared/StatusBadge";

import { useAuth } from "@/providers/AuthProvider";
import { ActionGuard } from "@/core/workflow/ActionGuard";
import { STOCKTAKE_STATUS_UI } from "@/domain/status-ui-map";
import { useAbortController } from "@/hooks/useAbortController";
import { useWarehouseLock } from "@/hooks/useWarehouseLock";
import { LockBanner } from "@/components/shared/LockBanner";
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

export function StocktakeCountClient({ id, locale }: { id: string, locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.stocktake')
  const common = useTranslations('common')
  const procurement = useTranslations('procurement')
  const baseRouter = useRouter();
  const { router: guardedRouter } = useUnsavedChangesGuard(false);
  const abortController = useAbortController();
  const { data: rawSession, isLoading: sessionLoading, error: sessionError } = useStocktake(id);
  const session = rawSession ? mapToSessionVM(rawSession) : null;
  const { data: warehousesData, isLoading: isLoadingWarehouses, error: errorWarehouses } = useWarehouses();
  const warehouses = warehousesData?.data || [];
  const updateCount = useUpdateItemCount();
  const completeCounting = useCompleteCounting();
  const { playSound } = useAudioFeedback();
  const { user } = useAuth();

  const [idempotencyKey] = React.useState(() => crypto.randomUUID());
  const { isOnline, wasReconnecting } = useNetworkStatus();

  // Warehouse Lock State
  const { data: lockState } = useWarehouseLock(session?.warehouseId || null);

  const [scanStatus, setScanStatus] = React.useState<"idle" | "success" | "error">("idle")
  const [statusMessage, setStatusMessage] = React.useState("")
  const [localCounts, setLocalCounts] = React.useState<Record<string, number>>({})
  // Track which rows the user has explicitly interacted with (typed or scanned).
  // A 0-count IS valid — it means the physical item is absent. We use this set
  // to distinguish "touched but zero" from "never touched".
  const [touchedItems, setTouchedItems] = React.useState<Set<string>>(new Set())
  const [focusedRowIndex, setFocusedRowIndex] = React.useState<number>(-1)
  const [isBatchModalOpen, setIsBatchModalOpen] = React.useState(false)
  const [disambiguationRows, setDisambiguationRows] = React.useState<StocktakeItemVM[]>([])

  const rowVirtualizerRef = React.useRef<{ scrollToIndex: (index: number, options?: { align?: string }) => void } | null>(null)
  const inputRefs = React.useRef<Map<number, HTMLInputElement>>(new Map())

  const items = session?.items || []

  const tableLines = React.useMemo(() => {
    return items.map((item) => ({
      id: item.id,
      item: {
        id: item.itemId,
        code: item.barcode || '',
        nameEn: item.itemName,
        nameAr: item.itemName,
        image: item.image || null,
        primaryUom: { code: item.uom }
      },
      qty: localCounts[item.id] ?? 0,
      uomId: '',
      lot: item.lotNumber ? { lotNumber: item.lotNumber, expiryDate: item.expiryDate || null } : null,
      lotNumber: item.lotNumber,
      expiryDate: item.expiryDate,
      itemId: item.itemId,
      uom: item.uom,
      barcode: item.barcode,
      itemName: item.itemName
    }));
  }, [items, localCounts])

  // Synchronize focus when index changes
  React.useEffect(() => {
    if (focusedRowIndex !== -1 && rowVirtualizerRef.current) {
      rowVirtualizerRef.current.scrollToIndex(focusedRowIndex, { align: 'center' });
      const timer = setTimeout(() => {
        const input = inputRefs.current.get(focusedRowIndex);
        if (input) {
          input.focus();
          input.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [focusedRowIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedRowIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedRowIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setFocusedRowIndex(-1);
      (document.activeElement as HTMLElement)?.blur();
    } else if (e.key === 'Enter') {
      if (e.target instanceof HTMLInputElement && e.target.type === 'number') {
        e.preventDefault();
        if (focusedRowIndex < items.length - 1) {
          setFocusedRowIndex(prev => prev + 1);
        } else {
          toast.info(t('last_item_reached'));
        }
      }
    }
  };

  const debouncedUpdate = useDebouncedCallback(
    (itemId: string, lineId: string, countedQty: number) => {
      if (!isOnline) return;
      updateCount.mutate({
        stocktakeId: id,
        itemId,
        lineId,
        countedQty,
        signal: abortController.signal,
        headers: {
          'X-Idempotency-Key': idempotencyKey
        }
      })
    },
    800
  )

  const isInitialized = React.useRef(false)
  React.useEffect(() => {
    if (session?.items && !isInitialized.current) {
      const counts: Record<string, number> = {}
      const alreadyTouched = new Set<string>()
      session.items.forEach((i) => {
        counts[i.id] = i.countedQty ?? 0
        // If the backend already has a non-null countedQty, the item was previously touched
        if (i.countedQty !== null && i.countedQty !== undefined) {
          alreadyTouched.add(i.id)
        }
      })
      setLocalCounts(counts)
      setTouchedItems(alreadyTouched)
      isInitialized.current = true
    }
  }, [session?.items])

  React.useEffect(() => {
    if (session && session.status !== 'STARTED' && session.status !== 'COUNTING') {
      baseRouter.replace(`/stocktake/${id}`);
    }
  }, [session?.status, id, baseRouter]);

  if (sessionLoading || isLoadingWarehouses) return <PageSkeleton variant="list" />;
  if (sessionError || errorWarehouses || !session) return <ErrorState onRetry={() => window.location.reload()} />;

  const warehouse = warehouses?.find((w) => w.id === session.warehouseId);
  const warehouseName = warehouse ? warehouse.name : (session.warehouseName || session.warehouseId);

  if (session.status !== 'STARTED' && session.status !== 'COUNTING') {
    return null;
  }

  const handleSelectBatch = (item: StocktakeItemVM) => {
    const currentQty = localCounts[item.id] || 0
    const newQty = currentQty + 1

    setLocalCounts(prev => ({ ...prev, [item.id]: newQty }))
    setTouchedItems(prev => new Set(prev).add(item.id))
    updateCount.mutate({
      stocktakeId: id,
      itemId: item.itemId,
      lineId: item.id,
      countedQty: newQty,
      signal: abortController.signal,
      headers: {
        'X-Idempotency-Key': idempotencyKey
      }
    })

    playSound('success');
    setScanStatus("success")
    setStatusMessage(`${item.itemName} (${item.lotNumber || (locale === 'ar' ? 'بدون رقم دفعة' : 'No Lot')}): ${newQty}`)
    
    const originalIndex = items.findIndex(i => i.id === item.id)
    if (originalIndex !== -1) {
      setFocusedRowIndex(originalIndex)
    }

    setIsBatchModalOpen(false)
    setDisambiguationRows([])

    setTimeout(() => {
      setScanStatus("idle")
      setStatusMessage("")
    }, 2000)
  }

  const handleScan = async (barcode: string) => {
    if (!isOnline) {
      toast.error(t('offline_error', { defaultValue: 'Offline: Scanning disabled' }));
      throw new Error('Offline');
    }
    const matchingRows = items.filter((i) => i.barcode === barcode)
    if (matchingRows.length === 0) {
      setScanStatus("error")
      setStatusMessage(t('no_item_found'))
      setTimeout(() => {
        setScanStatus("idle")
        setStatusMessage("")
      }, 3000)
      throw new Error('ItemNotFound')
    }

    if (matchingRows.length === 1) {
      // Condition A: Single Batch
      const item = matchingRows[0]
      const currentQty = localCounts[item.id] || 0
      const newQty = currentQty + 1

      setLocalCounts(prev => ({ ...prev, [item.id]: newQty }))
      setTouchedItems(prev => new Set(prev).add(item.id))
      updateCount.mutate({
        stocktakeId: id,
        itemId: item.itemId,
        lineId: item.id,
        countedQty: newQty,
        signal: abortController.signal,
        headers: {
          'X-Idempotency-Key': idempotencyKey
        }
      })

      playSound('success')
      setScanStatus("success")
      setStatusMessage(`${item.itemName}: ${newQty}`)
      
      const originalIndex = items.findIndex(i => i.id === item.id)
      if (originalIndex !== -1) {
        setFocusedRowIndex(originalIndex)
      }

      setTimeout(() => {
        setScanStatus("idle")
        setStatusMessage("")
      }, 2000)
    } else {
      // Condition B: Multiple Batches (Disambiguation)
      setDisambiguationRows(matchingRows)
      setIsBatchModalOpen(true)
    }
  }

  const handleFinish = () => {
    completeCounting.mutate({
      id,
      signal: abortController.signal,
      headers: {
        'X-Idempotency-Key': idempotencyKey
      }
    }, {
      onSuccess: () => {
        playSound('success');
        toast.success(t('posted_success'))
        guardedRouter.push(`/stocktake/${id}/variance`, { skipGuard: true })
      },
      onError: () => {
        playSound('error');
        toast.error(common('error'))
      }
    })
  }

  // An item is "uncounted" only if the user has never explicitly touched it.
  // A value of 0 is a valid count (physically absent item).
  const untouchedCount = items.filter(i => !touchedItems.has(i.id)).length;
  const touchedCount = items.length - untouchedCount;
  const allTouched = untouchedCount === 0 && items.length > 0;
  const progressPercent = items.length > 0 ? Math.round((touchedCount / items.length) * 100) : 0;

  return (
    <ScopeGuard warehouseId={session?.warehouseId}>
      <PermissionGate action="edit" resource="operations_stocktake">
        <div className="flex flex-col w-full min-h-[60vh] relative pb-24 md:pb-32" onKeyDown={handleKeyDown}>
          <div className="flex flex-col gap-4 md:gap-6 w-full pb-6">
            {/* Header Section */}
            <div className="flex flex-col gap-3 w-full mb-6 mt-4 relative text-start">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => baseRouter.push(`/stocktake/${id}`)}
                className="absolute top-0 end-0"
              >
                <MoveRight className="h-6 w-6 text-muted-foreground rtl:hidden" />
                <MoveLeft className="h-6 w-6 text-muted-foreground ltr:hidden" />
              </Button>

              <div className="flex flex-col gap-2 pr-12">
                <div className="flex items-center flex-wrap gap-2.5">
                  <h1 className="text-2xl font-black text-[#0B1220] dark:text-white uppercase tracking-tight">
                    STOCKTAKE
                  </h1>
                  <span dir="ltr" className="font-mono text-sm font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg w-fit">
                    {session.sessionName}
                  </span>
                  {/* Polished Counting Status Badge */}
                  <div className="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 font-bold px-4 py-1.5 rounded-full border border-cyan-200 dark:border-cyan-800/30 text-xs uppercase tracking-wide">
                    {locale === 'ar' ? 'جاري العد' : 'Counting'}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold text-[#0B1220] dark:text-gray-300 uppercase tracking-wide">
                    {warehouseName}
                  </div>
                  {updateCount.isPending && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 animate-pulse">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>{t('autosave_active')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          {!isOnline && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center justify-center gap-3">
              <span className="text-destructive font-bold uppercase tracking-wider text-sm">
                {t('offline_banner', { defaultValue: 'Offline Mode Active - Scanning and autosave paused' })}
              </span>
            </div>
          )}
          {wasReconnecting && (
            <div className="bg-muted/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="text-foreground font-bold uppercase tracking-wider text-sm">
                {t('reconnected_banner', { defaultValue: 'Reconnected — saving...' })}
              </span>
            </div>
          )}

          <div>
            <LockBanner lockState={lockState} />
          </div>

          <div className="max-w-2xl mx-auto w-full">
            <ScanInput
              onScan={handleScan}
              scanStatus={scanStatus}
              statusMessage={statusMessage}
              placeholder={t('scan_barcode_to_count')}
              label={procurement('pr.scan_or_search')}
              scannerMode={true}
              readOnly={!isOnline}
            />
          </div>

          <div className="w-full mb-6 hidden md:block">
            <Card className="p-4 md:p-10 bg-card border border-border shadow-sm border-none shadow-none rounded-xl md:rounded-[2.5rem]">
              <DocumentLineItemTable
                lines={tableLines}
                locale={locale}
                isReadOnly={false}
                hideLotColumns={false}
                enableVirtualization={true}
                maxHeight="600px"
                virtualizerRef={rowVirtualizerRef}
                rowClassName={(line, index) => cn(
                  focusedRowIndex === index && "bg-primary/5 ring-1 ring-primary/20",
                  touchedItems.has(line.id) && focusedRowIndex !== index && "bg-gray-500/[0.03]"
                )}
                headers={{ qty: t('counted_qty') }}
                renderQty={(line) => {
                  const index = tableLines.findIndex(l => l.id === line.id);
                  const isTouched = touchedItems.has(line.id);
                  const countValue = localCounts[line.id];
                  return (
                    <div className="relative flex items-center justify-center">
                      <Input
                        ref={(el) => {
                          if (el) inputRefs.current.set(index, el);
                          else inputRefs.current.delete(index);
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        lang="en"
                        dir="ltr"
                        value={countValue !== null && countValue !== undefined ? String(countValue) : "0"}
                        placeholder="0"
                        onFocus={() => setFocusedRowIndex(index)}
                        disabled={completeCounting.isPending || !isOnline}
                        onChange={(e) => {
                          const normalized = normalizeDigits(e.target.value).replace(/[^0-9.]/g, '');
                          const val = normalized ? parseFloat(normalized) : 0;
                          setLocalCounts(prev => ({ ...prev, [line.id]: val }));
                          setTouchedItems(prev => new Set(prev).add(line.id));
                          debouncedUpdate(line.itemId, line.id, val);
                        }}
                        className={cn(
                          "text-right font-mono tabular-nums w-full h-10 transition-all rounded-lg max-w-[120px] mx-auto focus:border-[#0B1220] dark:focus:border-[#b48e67] focus:ring-1 focus:ring-[#0B1220] dark:focus:ring-[#b48e67] outline-none",
                          isTouched
                            ? "bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                            : "bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100",
                          focusedRowIndex === index && "border-[#0B1220] dark:border-[#b48e67] ring-1 ring-[#0B1220] dark:ring-[#b48e67]"
                        )}
                      />
                      {isTouched && (
                        <CheckCircle2 className="absolute -end-5 h-3 w-3 text-slate-400 dark:text-[#b48e67]/60 shrink-0" />
                      )}
                    </div>
                  );
                }}
              />
            </Card>
          </div>

          <VirtualizedMobileGrid
            data={tableLines}
            estimateSize={180}
            maxHeight={650}
            className="pb-24 mt-4"
            renderCard={(line) => {
              const isTouched = touchedItems.has(line.id);
              const countValue = localCounts[line.id];
              return (
                <div 
                  key={line.id} 
                  className="bg-white dark:bg-[#1A2234] border-2 border-transparent focus-within:border-[#0B1220] dark:focus-within:border-[#b48e67] rounded-xl p-4 shadow-md flex flex-col gap-3 transition-all relative text-start"
                >
                  {/* TOP TIER: Item Info & UOM */}
                  <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-2">
                    <div className="flex flex-col w-[70%]">
                      <span className="text-sm font-black text-[#0B1220] dark:text-white leading-tight">
                        {line.itemName}
                      </span>
                      <span className="text-[10px] text-[#b48e67] font-medium font-mono tracking-widest mt-0.5">
                        {line.barcode || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded shrink-0">
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase">
                        {line.uom}
                      </span>
                    </div>
                  </div>

                  {/* MIDDLE TIER: Tracing (LOT & Expiry) */}
                  <div className="flex flex-col gap-1 bg-gray-50 dark:bg-[#0B1220] p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 uppercase font-bold">LOT:</span>
                      <span className="font-mono text-[#0B1220] dark:text-gray-200" dir="ltr">
                        {line.lotNumber && line.lotNumber.length > 15 ? line.lotNumber.slice(0, 15) + '...' : (line.lotNumber || '—')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 uppercase font-bold">EXP:</span>
                      <span className="font-mono text-[#0B1220] dark:text-gray-200" dir="ltr">
                        {line.expiryDate || '—'}
                      </span>
                    </div>
                  </div>

                  {/* BOTTOM TIER: The Active Input (Giant Target) */}
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">الكمية الفعلية</span>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      {isTouched && <CheckCircle2 className="w-5 h-5 text-slate-400 dark:text-[#b48e67] shrink-0" />}
                      <Input 
                        type="text" 
                        inputMode="decimal"
                        pattern="[0-9.]*"
                        lang="en-u-nu-latn"
                        className={cn(
                          "w-24 h-10 text-center font-black text-lg text-gray-900 dark:text-gray-100 focus:border-[#0B1220] dark:focus:border-[#b48e67] focus:ring-1 focus:ring-[#0B1220] dark:focus:ring-[#b48e67] rounded-lg outline-none [font-variant-numeric:lining-nums_tabular-nums]",
                          isTouched
                            ? "bg-white dark:bg-slate-800/50 border-gray-300 dark:border-gray-600"
                            : "bg-white dark:bg-slate-800/50 border-gray-300 dark:border-gray-600"
                        )}
                        dir="ltr"
                        value={countValue !== null && countValue !== undefined ? String(countValue) : "0"}
                        disabled={completeCounting.isPending || !isOnline}
                        onChange={(e) => {
                          const normalized = normalizeDigits(e.target.value).replace(/[^0-9.]/g, '');
                          const val = normalized ? parseFloat(normalized) : 0;
                          setLocalCounts(prev => ({ ...prev, [line.id]: val }));
                          setTouchedItems(prev => new Set(prev).add(line.id));
                          debouncedUpdate(line.itemId, line.id, val);
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            }}
          />
         </div>

        {/* ── Sticky Submit Footer ── */}
        <div className="sticky bottom-0 mt-auto w-full bg-background border-t border-border/50 p-4 md:p-6 shadow-[0_-20px_40px_rgba(0,0,0,0.6)] z-50 flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Right/Start Side: The Button */}
          <div className="w-full md:w-auto">
            <ActionGuard
              documentType="STOCKTAKE"
              action="SUBMIT"
              status={session.status}
              role={user?.role || ''}
              onConfirm={handleFinish}
              trigger={
                <Button
                  disabled={completeCounting.isPending || !isOnline}
                  className={cn(
                    "h-14 w-full md:w-auto px-8 rounded-[1.25rem] text-white font-bold text-label-sm uppercase tracking-wide transition-all shrink-0",
                    "shadow-lg hover:shadow-xl active:scale-[0.98]",
                    allTouched
                      ? "bg-[#0B1220] dark:bg-[#b48e67] hover:bg-[#1A2234] dark:hover:bg-[#c59d74] text-white dark:text-[#0B1220] shadow-lg shadow-[#0B1220]/20 dark:shadow-[#b48e67]/20"
                      : "bg-[#0B1220]/80 dark:bg-[#b48e67]/80 hover:bg-[#0B1220] dark:hover:bg-[#b48e67] text-white/90 dark:text-[#0B1220]/90 shadow-md shadow-[#b48e67]/10"
                  )}
                >
                  {completeCounting.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <SendHorizonal className="h-4 w-4 me-2" />
                      {t('submit_for_review')}
                    </>
                  )}
                </Button>
              }
            />
          </div>

          {/* Left/End Side: Progress Info & Bar */}
          <div className="flex flex-col flex-1 min-w-0 w-full md:w-auto gap-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">{t('items_counted')}</span>
              <span className={cn(
                "font-bold tabular-nums",
                allTouched ? "text-[#b48e67]" : "text-slate-500"
              )}>
                {touchedCount} / {items.length}
              </span>
            </div>
            {/* The Progress Bar itself */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  allTouched ? "bg-[#b48e67]" : "bg-[#b48e67]/40"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Batch Disambiguation Modal */}
      <Dialog open={isBatchModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsBatchModalOpen(false);
          setDisambiguationRows([]);
        }
      }}>
        <DialogContent className="w-[min(540px,95vw)] bg-card border border-border shadow-2xl p-6 rounded-2xl text-start">
          <DialogHeader className="pb-3 border-b border-border text-start">
            <DialogTitle className="text-lg font-bold text-foreground">
              {locale === 'ar' ? 'تحديد الدفعة / التشغيلة' : 'Select Batch / Lot'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {locale === 'ar'
                ? 'يحتوي هذا الصنف على دفعات متعددة في الجرد الحالي. يرجى تحديد الدفعة التي تقوم بعدّها الآن:'
                : 'This item has multiple active batches in the current snapshot. Please select the batch you are physically counting:'}
            </DialogDescription>
          </DialogHeader>

          {disambiguationRows.length > 0 && (
            <div className="py-2 text-start">
              <div className="mb-3 px-3 py-2 bg-[#b48e67]/10 dark:bg-[#b48e67]/5 border border-[#b48e67]/20 rounded-xl">
                <span className="text-[11px] uppercase font-bold text-gray-400 block tracking-wider">
                  {locale === 'ar' ? 'الصنف المعني' : 'Scanned Item'}
                </span>
                <span className="text-sm font-black text-foreground">
                  {disambiguationRows[0]?.itemName}
                </span>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {disambiguationRows.map((row) => {
                  const currentVal = localCounts[row.id] ?? 0;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => handleSelectBatch(row)}
                      className="w-full text-start flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-border hover:border-primary bg-card hover:bg-muted/50 dark:hover:bg-slate-800/40 transition-all duration-200 active:scale-[0.99] gap-3 group"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground font-mono bg-muted px-2 py-0.5 rounded border border-border group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            {row.lotNumber || (locale === 'ar' ? 'بدون رقم دفعة' : 'No Lot')}
                          </span>
                        </div>
                        {row.expiryDate && (
                          <span className="text-[10px] text-muted-foreground/80 font-semibold font-mono" dir="ltr">
                            {locale === 'ar' ? 'صلاحية: ' : 'Exp: '}
                            {row.expiryDate}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 shrink-0 sm:self-center">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                            {locale === 'ar' ? 'النظام' : 'System'}
                          </span>
                          <span className="text-xs font-bold font-mono text-gray-500">
                            {row.snapshotQty !== null ? `${row.snapshotQty} ${row.uom}` : '—'}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-[#b48e67] uppercase tracking-wide">
                            {locale === 'ar' ? 'المعدود' : 'Counted'}
                          </span>
                          <span className="text-sm font-black font-mono text-foreground">
                            {currentVal} {row.uom}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
     </PermissionGate>
    </ScopeGuard>
  )
}
