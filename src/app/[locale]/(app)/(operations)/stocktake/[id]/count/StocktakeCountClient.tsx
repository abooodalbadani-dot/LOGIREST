"use client"

import * as React from "react";
import { useStocktake, useUpdateItemCount, useCompleteCounting } from "@/features/operations/api/useStocktakes";
import { useWarehouses } from "@/features/warehouses/api/useWarehouses";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useVirtualizer } from "@tanstack/react-virtual";
import { mapToSessionVM, StocktakeItemVM } from "@/features/operations/mappers/stocktakeMapper";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { ScanInput } from "@/components/shared/ScanInput/ScanInput";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { PostConfirmDialog } from "@/components/shared/PostConfirmDialog";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";

import { isStocktakeCounting } from "@/domain/status-guards";

export function StocktakeCountClient({ id, locale }: { id: string, locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.stocktake')
  const common = useTranslations('common')
  const router = useRouter()
  const { data: rawSession, isLoading } = useStocktake(id);
  const session = rawSession ? mapToSessionVM(rawSession) : null;
  const { data: warehouses } = useWarehouses();
  const updateCount = useUpdateItemCount();
  const completeCounting = useCompleteCounting();

  const [scanStatus, setScanStatus] = React.useState<"idle" | "success" | "error">("idle")
  const [statusMessage, setStatusMessage] = React.useState("")
  const [localCounts, setLocalCounts] = React.useState<Record<string, number>>({})
  const [focusedRowIndex, setFocusedRowIndex] = React.useState<number>(-1)
  
  const parentRef = React.useRef<HTMLDivElement>(null)
  const inputRefs = React.useRef<Map<number, HTMLInputElement>>(new Map())

  const items = session?.items || []

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 10,
  })

  // Synchronize focus when index changes
  React.useEffect(() => {
    if (focusedRowIndex !== -1) {
      rowVirtualizer.scrollToIndex(focusedRowIndex, { align: 'center' });
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
  }, [focusedRowIndex, rowVirtualizer]);

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
      updateCount.mutate({ stocktakeId: id, itemId, lineId, countedQty })
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

  if (isLoading) return <LoadingSkeleton />
  if (!session) return <ErrorState onRetry={() => window.location.reload()} />;
  
  const warehouse = warehouses?.find((w) => w.id === session.warehouseId);
  const warehouseName = warehouse ? (locale === 'ar' ? warehouse.nameAr : warehouse.nameEn) : (session.warehouseName || session.warehouseId);

  if (!isStocktakeCounting(session.status)) {
    router.replace(`/stocktake/${id}`);
    return null;
  }

  const handleScan = async (barcode: string) => {
    const index = items.findIndex((i) => i.barcode === barcode)
    if (index !== -1) {
      const item = items[index] as StocktakeItemVM
      const currentQty = localCounts[item.id] || 0
      const newQty = currentQty + 1
      
      setLocalCounts(prev => ({ ...prev, [item.id]: newQty }))
      await updateCount.mutateAsync({ stocktakeId: id, itemId: item.itemId, lineId: item.id, countedQty: newQty })
      
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

  const handleFinish = async () => {
    try {
      await completeCounting.mutateAsync(id)
      toast.success(t('posted_success'))
      router.push(`/stocktake/${id}/variance`)
    } catch {
      toast.error(common('error'))
    }
  }

  const hasCountedItems = session.items.some((i) => (localCounts[i.id] || 0) > 0)

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

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
              className="px-4 py-1"
            />
            <PostConfirmDialog
              title={t('confirm_finish_title')}
              description={t('confirm_finish_desc')}
              onConfirm={handleFinish}
              trigger={
                <Button disabled={!hasCountedItems || completeCounting.isPending}>
                  {t('finish_counting')}
                </Button>
              }
            />
          </div>
        </PageHeader>

        <Card className="p-10 bg-surface-container-low border-none shadow-none rounded-[2.5rem]">
          <div className="max-w-md mx-auto mb-12">
            <ScanInput 
              onScan={handleScan}
              scanStatus={scanStatus}
              statusMessage={statusMessage}
              isScanning={updateCount.isPending}
              placeholder={t('scan_placeholder')}
              scannerMode={true}
            />
            <p className="text-center text-label-xs font-semibold text-muted-foreground/30 uppercase mt-3">
              {t('scan_mode')}
            </p>
          </div>

          <div 
            ref={parentRef}
            className="rounded-3xl bg-white/[0.01] overflow-auto h-[600px] relative"
          >
            <Table>
              <TableHeader className="bg-white/[0.02] sticky top-0 z-10 backdrop-blur-md">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12 px-8 w-[40%]">{common('item')}</TableHead>
                  <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12 w-[30%]">{common('lot')}</TableHead>
                  <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12 w-[150px]">{t('counted_qty')}</TableHead>
                  <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-end h-12 px-8 w-[100px]">{common('uom')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <div style={{ height: `${totalSize}px`, width: '100%', position: 'relative' }}>
                  {virtualRows.map((virtualRow) => {
                    const item = items[virtualRow.index];
                    const isFocused = focusedRowIndex === virtualRow.index;

                    return (
                      <TableRow 
                        key={virtualRow.key} 
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        className={cn(
                          "hover:bg-white/[0.01] transition-colors border-none group absolute top-0 left-0 w-full",
                          isFocused && "bg-primary/5 ring-1 ring-primary/20"
                        )}
                        style={{
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <TableCell className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.itemName}</span>
                            <span className="text-label-xs font-semibold text-muted-foreground/40 font-mono" dir="ltr">{item.barcode}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-body-md font-mono font-semibold text-muted-foreground/60" dir="ltr">{item.lotNumber}</span>
                            <span className="text-label-xs font-semibold text-muted-foreground/30 uppercase" dir="ltr">{item.expiryDate}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            ref={(el) => {
                              if (el) inputRefs.current.set(virtualRow.index, el);
                              else inputRefs.current.delete(virtualRow.index);
                            }}
                            type="number"
                            value={localCounts[item.id] ?? ''} 
                            onFocus={() => setFocusedRowIndex(virtualRow.index)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              setLocalCounts(prev => ({ ...prev, [item.id]: val }))
                              debouncedUpdate(item.itemId, item.id, val)
                            }}
                            className={cn(
                              "text-center font-mono font-semibold h-10 bg-surface-container-medium border-none focus-visible:ring-1 transition-all rounded-lg",
                              isFocused ? "focus-visible:ring-primary" : "focus-visible:ring-primary/30"
                            )}
                            dir="ltr"
                          />
                        </TableCell>
                        <TableCell className="text-end px-8 font-semibold text-label-xs text-muted-foreground/40 uppercase">
                          {item.uom}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </div>
              </TableBody>
            </Table>
            {items.length === 0 && (
              <div className="h-32 flex items-center justify-center text-muted-foreground italic">
                {t('no_items_counted')}
              </div>
            )}
          </div>
        </Card>
      </div>
    </PermissionGate>
  )
}
