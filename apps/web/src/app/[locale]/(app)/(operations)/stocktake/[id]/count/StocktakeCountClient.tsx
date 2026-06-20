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

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DocumentLineItemTable } from "@/components/shared/DocumentLineItemTable/DocumentLineItemTable";
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

  const handleScan = async (barcode: string) => {
    if (!isOnline) {
      toast.error(t('offline_error', { defaultValue: 'Offline: Scanning disabled' }));
      throw new Error('Offline');
    }
    const index = items.findIndex((i) => i.barcode === barcode)
    if (index !== -1) {
      const item = items[index] as StocktakeItemVM
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

      setScanStatus("success")
      setStatusMessage(`${item.itemName}: ${newQty}`)
      setFocusedRowIndex(index)

      setTimeout(() => {
        setScanStatus("idle")
        setStatusMessage("")
      }, 2000)
    } else {
      setScanStatus("error")
      setStatusMessage(t('no_item_found'))
      setTimeout(() => {
        setScanStatus("idle")
        setStatusMessage("")
      }, 3000)
      throw new Error('ItemNotFound')
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
        <div className="flex flex-col w-full min-h-[60vh] relative" onKeyDown={handleKeyDown}>
          <div className="flex flex-col gap-4 md:gap-6 w-full pb-6">
            {/* Header Section */}
            <div className="flex flex-col items-start text-start gap-4 w-full mb-6 mt-4 relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => baseRouter.push(`/stocktake/${id}`)}
                className="absolute top-0 end-0"
              >
                <MoveRight className="h-6 w-6 text-muted-foreground rtl:hidden" />
                <MoveLeft className="h-6 w-6 text-muted-foreground ltr:hidden" />
              </Button>

              <div className="flex flex-col gap-1 w-full pr-12">
                <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
                  STOCKTAKE
                </h1>
                <div className="text-xl font-bold tracking-widest text-brand-gold font-mono break-all">
                  {session.sessionName}
                </div>
              </div>

              <div className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                {warehouseName}
              </div>

              <div className="flex items-center gap-4 mt-2">
                {updateCount.isPending && (
                  <div className="flex items-end gap-2 text-label-sm text-muted-foreground animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('autosave_active')}
                  </div>
                )}
                <StatusBadge
                  status={session.status}
                  configMap={STOCKTAKE_STATUS_UI}
                  className="h-10 px-4 text-label-md font-semibold border-none"
                />
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
            <div className="bg-muted/50 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
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

          <div className="w-full mb-6">
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
                  touchedItems.has(line.id) && focusedRowIndex !== index && "bg-emerald-500/[0.03]"
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
                          const rawValue = e.target.value.replace(/[^0-9]/g, '');
                          const val = rawValue ? parseInt(rawValue, 10) : 0;
                          setLocalCounts(prev => ({ ...prev, [line.id]: val }))
                          setTouchedItems(prev => new Set(prev).add(line.id))
                          debouncedUpdate(line.itemId, line.id, val)
                        }}
                        className={cn(
                          "text-right font-mono tabular-nums bg-white/5 border border-border/50 text-foreground w-full h-10 focus-visible:ring-1 transition-all rounded-lg max-w-[120px] mx-auto",
                          isTouched
                            ? "bg-emerald-500/10 focus-visible:ring-emerald-500/40 border-emerald-500/30"
                            : "focus-visible:ring-primary/30",
                          focusedRowIndex === index && "focus-visible:ring-primary"
                        )}
                      />
                      {isTouched && (
                        <CheckCircle2 className="absolute -end-5 h-3 w-3 text-emerald-500/60 shrink-0" />
                      )}
                    </div>
                  );
                }}
              />
            </Card>
          </div>
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
                      ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30 hover:shadow-emerald-500/50"
                      : "bg-brand-gold hover:bg-brand-gold-hover shadow-brand-gold/20 hover:shadow-brand-gold/40"
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
                allTouched ? "text-emerald-400" : "text-brand-gold"
              )}>
                {touchedCount} / {items.length}
              </span>
            </div>
            {/* The Progress Bar itself */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  allTouched ? "bg-emerald-500" : "bg-brand-gold"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

        </div>
      </div>
     </PermissionGate>
    </ScopeGuard>
  )
}
