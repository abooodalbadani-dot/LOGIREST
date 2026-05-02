"use client"

import * as React from "react";
import { useStocktake, useUpdateItemCount, useCompleteCounting } from "@/features/operations/api/useStocktakes";
import { useWarehouses } from "@/features/warehouses/api/useWarehouses";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

export function StocktakeCountClient({ id, locale }: { id: string, locale: 'ar' | 'en' }) {
 const t = useTranslations('operations.stocktake')
 const common = useTranslations('common')
 const router = useRouter()
 const { data: session, isLoading, error } = useStocktake(id);
 const { data: warehouses } = useWarehouses();
 const updateCount = useUpdateItemCount();
 const completeCounting = useCompleteCounting();

 const [scanStatus, setScanStatus] = React.useState<"idle" | "success" | "error">("idle")
 const [statusMessage, setStatusMessage] = React.useState("")

 // Local state for immediate UI feedback before debounce
 const [localCounts, setLocalCounts] = React.useState<Record<string, number>>({})

 // Auto-save logic
 const debouncedUpdate = useDebouncedCallback(
 (itemId: string, countedQty: number) => {
 updateCount.mutate({ stocktakeId: id, itemId, countedQty })
 },
 800
 )

 const isInitialized = React.useRef(false)
 React.useEffect(() => {
 if (session?.items && !isInitialized.current) {
 const counts: Record<string, number> = {}
 session.items.forEach(i => {
 counts[i.itemId] = i.countedQty || 0
 })
 setLocalCounts(counts)
 isInitialized.current = true
 }
 }, [session?.items])

 if (isLoading) return <LoadingSkeleton />
 if (!session) return <ErrorState onRetry={() => window.location.reload()} />;
 
 const warehouse = warehouses?.find(w => w.id === session.warehouseId);
 const warehouseName = warehouse ? (locale === 'ar' ? warehouse.nameAr : warehouse.nameEn) : (session.warehouseName || session.warehouseId);

 // Redirect if not in Started or Counting status
 if (!['STARTED', 'COUNTING'].includes(session.status)) {
 router.replace(`/stocktake/ ${id}`);
 return null;
 }

 const handleScan = async (barcode: string) => {
 const item = session.items.find(i => i.barcode === barcode)
 if (item) {
 const currentQty = localCounts[item.itemId] || 0
 const newQty = currentQty + 1
 
 // Update local state immediately
 setLocalCounts(prev => ({ ...prev, [item.itemId]: newQty }))
 
 // Persist immediately for scans (or use debounce)
 await updateCount.mutateAsync({ stocktakeId: id, itemId: item.itemId, countedQty: newQty })
 
 setScanStatus("success")
 setStatusMessage(`${item.itemName}: ${newQty}`)
 
 // Reset status after delay
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
 router.push(`/stocktake/ ${id}/variance`)
 } catch {
 toast.error(common('error'))
 }
 }

 const hasCountedItems = session.items.some(i => (localCounts[i.itemId] || 0) > 0)

 return (
 <PermissionGate action="edit" resource="operations_stocktake">
 <div className="space-y-6">
 <PageHeader
 title={session.sessionName}
 subtitle={warehouseName}
 backHref={`/stocktake/ ${id}`}
 >
 <div className="flex items-center gap-4">
 {updateCount.isPending && (
 <div className="flex items-center gap-2 text-label-sm text-muted-foreground animate-pulse">
 <Loader2 className="h-3 w-3 animate-spin" />
 {t('autosave_active')}
 </div>
 )}
 <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-4 py-1">
 {t('counting_status')}
 </Badge>
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
 />
 <p className="text-center text-label-xs font-semibold text-muted-foreground/30 uppercase mt-3">
 {t('scan_mode')}
 </p>
 </div>

 <div className="rounded-3xl bg-white/[0.01] overflow-hidden">
 <Table>
 <TableHeader className="bg-white/[0.02]">
 <TableRow className="hover:bg-transparent border-none">
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12 px-8 w-[40%]">{common('item')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12 w-[30%]">{common('lot')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12 w-[150px]">{t('counted_qty')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-end h-12 px-8 w-[100px]">{common('uom')}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {session.items.map((item) => (
 <TableRow key={item.id} className="hover:bg-white/[0.01] transition-colors border-none group">
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
 type="number"
 value={localCounts[item.itemId] ?? ''} onChange={(e) => {
 const val = parseFloat(e.target.value) || 0
 setLocalCounts(prev => ({ ...prev, [item.itemId]: val }))
 debouncedUpdate(item.itemId, val)
 }}
 className="text-center font-mono font-semibold h-10 bg-surface-container-medium border-none focus-visible:ring-1 focus-visible:ring-primary/30 transition-all rounded-lg"
 dir="ltr"
 />
 </TableCell>
 <TableCell className="text-end px-8 font-semibold text-label-xs text-muted-foreground/40 uppercase">
 {item.uom}
 </TableCell>
 </TableRow>
 ))}
 {session.items.length === 0 && (
 <TableRow>
 <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
 {t('no_items_counted')}
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 </Card>
 </div>
 </PermissionGate>
 )
}
