"use client"

import * as React from "react";
import { useStocktake, useUpdateItemCount, useCompleteCounting } from "@/features/operations/api/useStocktakes";
import { useWarehouses } from "@/features/warehouses/api/useWarehouses";
import { useTranslations } from "next-intl";
import { useDebouncedCallback } from "use-debounce";
import { useRouter } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
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
import { StatusBadge } from "@/components/shared/StatusBadge";

import { useAuth } from "@/providers/AuthProvider";
import { ActionGuard } from "@/core/workflow/ActionGuard";
import { isStocktakeCounting } from "@/domain/status-guards";
import { STOCKTAKE_STATUS_UI } from "@/domain/status-ui-map";
import { useAbortController } from "@/hooks/useAbortController";
import { useWarehouseLock } from "@/hooks/useWarehouseLock";
import { LockBanner } from "@/components/shared/LockBanner";
import { audioAlerts } from "@/utils/audio";

export function StocktakeCountClient({ id, locale }: { id: string, locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.stocktake')
  const common = useTranslations('common')
  const baseRouter = useRouter();
  const { router: guardedRouter } = useUnsavedChangesGuard(false);
  const abortController = useAbortController();
  const { data: rawSession, isLoading: sessionLoading, error: sessionError } = useStocktake(id);
  const session = rawSession ? mapToSessionVM(rawSession) : null;
  const { data: warehouses, isLoading: isLoadingWarehouses, error: errorWarehouses } = useWarehouses();
  const updateCount = useUpdateItemCount();
  const completeCounting = useCompleteCounting();

  const [idempotencyKey] = React.useState(() => crypto.randomUUID());
  const { isOnline } = useNetworkStatus();

  // Warehouse Lock State
  const { data: lockState } = useWarehouseLock(session?.warehouseId || null);

  const [scanStatus, setScanStatus] = React.useState<"idle" | "success" | "error">("idle")
  const [statusMessage, setStatusMessage] = React.useState("")
  const [localCounts, setLocalCounts] = React.useState<Record<string, number>>({})
  const [focusedRowIndex, setFocusedRowIndex] = React.useState<number>(-1)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowVirtualizerRef = React.useRef<any>(null)
  const inputRefs = React.useRef<Map<number, HTMLInputElement>>(new Map())

  const items = session?.items || []

  const tableLines = React.useMemo(() => {
    return items.map((item) => ({
      id: item.id,
      item: {
        id: item.itemId,
        code: item.barcode || '',
        name_en: item.itemName,
        name_ar: item.itemName,
        primary_uom: { code: item.uom }
      },
      qty: localCounts[item.id] ?? 0,
      uom_id: '',
      lot: item.lotNumber ? { lot_number: item.lotNumber, expiry_date: item.expiryDate || null } : null,
      lotNumber: item.lotNumber,
      expiryDate: item.expiryDate,
      itemId: item.itemId,
      uom: item.uom,
      barcode: item.barcode,
      itemName: item.itemName
    }));
  }, [items, localCounts]);

  // Synchronize focus when index changes
  React.useEffect(() => {
    if (focusedRowIndex !== -1 && rowVirtualizerRef.current) {
      rowVirtualizerRef.current.scrollToIndex(focusedRowIndex, { align: 'center' });
      // Small timeout to allow virtualization to render the row
      const timer = setTimeout(() => {
        const input = inputRefs.current.get(focusedRowIndex);
        if (input) {
          input.focus();
          input.select(); // Better UX for editing
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
      // If we are in an input, move to next row
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
      session.items.forEach((i) => {
        counts[i.id] = i.countedQty || 0
      })
      setLocalCounts(counts)
      isInitialized.current = true
    }
  }, [session?.items])

  if (sessionLoading || isLoadingWarehouses) return <PageSkeleton variant="list" />;
  if (sessionError || errorWarehouses || !session) return <ErrorState onRetry={() => window.location.reload()} />;
  
  const warehouse = warehouses?.find((w) => w.id === session.warehouseId);
  const warehouseName = warehouse ? (locale === 'ar' ? warehouse.name_ar : warehouse.name_en) : (session.warehouseName || session.warehouseId);

  if (!isStocktakeCounting(session.status)) {
    baseRouter.replace(`/stocktake/${id}`);
    return null;
  }

  const handleScan = async (barcode: string) => {
    if (!isOnline) {
      toast.error(t('offline_error', { defaultValue: 'Offline: Scanning disabled' }));
      return;
    }
    const index = items.findIndex((i) => i.barcode === barcode)
    if (index !== -1) {
      const item = items[index] as StocktakeItemVM
      const currentQty = localCounts[item.id] || 0
      const newQty = currentQty + 1
      
      setLocalCounts(prev => ({ ...prev, [item.id]: newQty }))
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
      
      // Focus the scanned row for immediate verification
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
        toast.success(t('posted_success'))
        guardedRouter.push(`/stocktake/${id}/variance`, { skipGuard: true })
      },
      onError: () => {
        toast.error(common('error'))
      }
    })
  }



  return (
    <PermissionGate action="edit" resource="operations_stocktake">
      <div className="space-y-6" onKeyDown={handleKeyDown}>
        <PageHeader
          title={session.sessionName}
          subtitle={warehouseName}
          backHref={`/stocktake/${id}`}
        >
          <div className="flex items-center gap-4">
            {updateCount.isPending && (
              <div className="flex items-center gap-2 text-label-sm text-muted-foreground animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('autosave_active')}
              </div>
            )}
            <StatusBadge 
              status={session.status} 
              configMap={STOCKTAKE_STATUS_UI}
              className="h-9 px-4 text-label-xs font-semibold border-none" 
            />
            <ActionGuard
              documentType="STOCKTAKE"
              action="SUBMIT"
              status={session.status}
              onConfirm={handleFinish}
              trigger={
                <Button 
                  disabled={!items.some((i) => (localCounts[i.id] || 0) > 0) || completeCounting.isPending}
                  className="primary-gradient shadow-lg shadow-primary/20"
                >
                  {completeCounting.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  )}
                  {t('finish_counting')}
                </Button>
              }
            />
          </div>
        </PageHeader>

        {!isOnline && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center justify-center gap-3">
            <span className="text-destructive font-bold uppercase tracking-wider text-sm">
              {t('offline_banner', { defaultValue: 'Offline Mode Active - Scanning and autosave paused' })}
            </span>
          </div>
        )}

        <LockBanner lockState={lockState} />

        <div className="max-w-2xl mx-auto w-full">
          <ScanInput
            onScan={handleScan}
            scanStatus={scanStatus}
            statusMessage={statusMessage}
            placeholder={t('scan_barcode_to_count')}
            label={t('scan_session')}
            scannerMode={true}
            readOnly={!isOnline}
          />
        </div>

        <Card className="p-10 bg-surface-container-low border-none shadow-none rounded-[2.5rem]">
          <DocumentLineItemTable
            lines={tableLines}
            locale={locale}
            isReadOnly={false}
            hideLotColumns={false}
            enableVirtualization={true}
            maxHeight="600px"
            virtualizerRef={rowVirtualizerRef}
            rowClassName={(line, index) => cn(
              focusedRowIndex === index && "bg-primary/5 ring-1 ring-primary/20"
            )}
            headers={{ qty: t('counted_qty') }}
            renderQty={(line) => {
              const index = tableLines.findIndex(l => l.id === line.id);
              return (
                <Input
                  ref={(el) => {
                    if (el) inputRefs.current.set(index, el);
                    else inputRefs.current.delete(index);
                  }}
                  type="number"
                  value={localCounts[line.id] ?? ''} 
                  onFocus={() => setFocusedRowIndex(index)}
                  disabled={completeCounting.isPending || !isOnline}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    setLocalCounts(prev => ({ ...prev, [line.id]: val }))
                    debouncedUpdate(line.itemId, line.id, val)
                  }}
                  className={cn(
                    "text-center font-mono font-semibold h-10 bg-surface-container-medium border-none focus-visible:ring-1 transition-all rounded-lg max-w-[120px] mx-auto",
                    focusedRowIndex === index ? "focus-visible:ring-primary" : "focus-visible:ring-primary/30"
                  )}
                  dir="ltr"
                />
              );
            }}
          />
        </Card>
      </div>
    </PermissionGate>
  )
}
