"use client"

import * as React from "react";
import { useStocktake, useSubmitVariance } from "@/features/operations/api/useStocktakes";
import { useWarehouses } from "@/features/warehouses/api/useWarehouses";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { 
 AlertTriangle, 
 CheckCircle2 
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { PostConfirmDialog } from "@/components/shared/PostConfirmDialog";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";

export function StocktakeVarianceClient({ id, locale }: { id: string, locale: 'ar' | 'en' }) {
 const t = useTranslations('operations.stocktake')
 const common = useTranslations('common')
 const router = useRouter()
 const { data: session, isLoading, error } = useStocktake(id);
 const { data: warehouses } = useWarehouses();
 const submitVariance = useSubmitVariance();

 const [reasons, setReasons] = React.useState<Record<string, string>>({})

 const isInitialized = React.useRef(false)
 React.useEffect(() => {
 if (session?.items && !isInitialized.current) {
 const initialReasons: Record<string, string> = {}
 session.items.forEach(item => {
 if (item.varianceReason) {
 initialReasons[item.itemId] = item.varianceReason
 }
 })
 setReasons(initialReasons)
 isInitialized.current = true
 }
 }, [session?.items])

 if (isLoading) return <LoadingSkeleton />
 if (!session) return <ErrorState onRetry={() => window.location.reload()} />;

 const warehouse = warehouses?.find(w => w.id === session.warehouseId);
 const warehouseName = warehouse ? (locale === 'ar' ? warehouse.nameAr : warehouse.nameEn) : (session.warehouseName || session.warehouseId);

 // Status check: Must be COUNTING_COMPLETED or VarianceSubmitted
 if (!['COUNTING_COMPLETED', 'VarianceSubmitted'].includes(session.status)) {
 router.replace(`/stocktake/ ${id}`);
 return null;
 }

 const handleReasonChange = (itemId: string, value: string) => {
 setReasons(prev => ({ ...prev, [itemId]: value }))
 }

 const isReasonValid = (itemId: string, variance: number) => {
 if (variance === 0) return true
 const reason = reasons[itemId] || ""
 return reason.trim().length >= 10
 }

 const canSubmit = session.items.every(item => {
 const variance = (item.countedQty || 0) - item.snapshotQty
 return isReasonValid(item.itemId, variance)
 })

 const handleSubmit = async () => {
 try {
 const updates = session.items.map(item => ({
 itemId: item.itemId,
 varianceReason: reasons[item.itemId] || ""
 }))
 await submitVariance.mutateAsync({ id, items: updates })
 toast.success(t('posted_success_variance'))
 router.push(`/stocktake/ ${id}`)
 } catch {
 toast.error(common('error'))
 }
 }

 return (
 <PermissionGate action="edit" resource="operations_stocktake">
 <div className="space-y-6">
 <PageHeader
 title={t('variance_review')}
 subtitle={`${warehouseName} ${common('dash')} ${t('variance_review_desc')}`}
 backHref={`/stocktake/ ${id}/count`}
 >
 <div className="flex items-center gap-4">
 <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-4 py-1">
 {t('variance_status')}
 </Badge>
 <PostConfirmDialog
 title={t('confirm_variance_title')}
 description={t('confirm_variance_desc')}
 onConfirm={handleSubmit}
 trigger={
 <Button disabled={!canSubmit || submitVariance.isPending} className="primary-gradient shadow-lg shadow-primary/20">
 {t('submit_for_approval')}
 </Button>
 }
 />
 </div>
 </PageHeader>

 <Card className="p-10 bg-surface-container-low border-none shadow-none rounded-[2.5rem]">
 <div className="rounded-3xl bg-white/[0.01] overflow-hidden">
 <Table>
 <TableHeader className="bg-white/[0.02]">
 <TableRow className="hover:bg-transparent border-none">
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12 px-8 w-[25%]">{common('item')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('snapshot_qty')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('counted_qty')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('variance')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('variance_value')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12 w-[30%]">{t('variance_reason')}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {session.items.map((item) => {
 const counted = item.countedQty || 0
 const variance = counted - item.snapshotQty
 const hasVariance = variance !== 0
 const reasonError = hasVariance && !isReasonValid(item.itemId, variance)

 return (
 <TableRow key={item.id} className={cn("transition-colors border-none group", hasVariance ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.04]" : "hover:bg-white/[0.01]")}>
 <TableCell className="px-8 py-6">
 <div className="flex flex-col gap-1">
 <span className="font-bold text-foreground group-hover:text-primary transition-colors">{item.itemName}</span>
 <span className="text-label-xs font-semibold text-muted-foreground/40 font-mono" dir="ltr">{item.barcode}</span>
 </div>
 </TableCell>
 <TableCell className="text-center font-mono font-bold text-muted-foreground/60" dir="ltr">
 {item.snapshotQty} {item.uom}
 </TableCell>
 <TableCell className="text-center font-mono font-semibold text-foreground" dir="ltr">
 {counted} {item.uom}
 </TableCell>
 <TableCell className="text-center">
 <div className={cn(
 "inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-semibold text-label-xs",
 variance === 0 ? "bg-emerald-500/10 text-emerald-500" : 
 variance > 0 ? "bg-blue-500/10 text-blue-500" : 
 "bg-red-500/10 text-red-500"
 )} dir="ltr">
 {variance === 0 ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
 {variance > 0 ? '+' : ''}{variance}
 </div>
 </TableCell>
 <TableCell className="text-center">
 <div className={cn(
 "font-mono text-label-sm font-semibold",
 variance === 0 ? "text-muted-foreground/40" : 
 variance > 0 ? "text-blue-500" : "text-red-500"
 )} dir="ltr">
 {(variance * item.unitCost).toFixed(2)} {common('currencies.sar')}
 </div>
 </TableCell>
 <TableCell>
 {hasVariance ? (
 <div className="space-y-1.5">
 <Textarea
 value={reasons[item.itemId] || ""} onChange={(e) => handleReasonChange(item.itemId, e.target.value)}
 placeholder={t('mandatory_reason')}
 className={cn(
 "min-h-[80px] text-body-md bg-surface-container-medium border-none resize-none transition-all rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30",
 reasonError ? "bg-amber-500/10 focus-visible:ring-amber-500/50" : ""
 )}
 />
 {reasonError && (
 <p className="text-label-xs text-amber-500 font-medium animate-in fade-in slide-in-from-top-1">
 {t('validation.variance_reason_min')}
 </p>
 )}
 </div>
 ) : (
 <div className="text-label-sm text-muted-foreground italic flex items-center gap-1.5 justify-center">
 <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />
 {t('no_variance_recorded')}
 </div>
 )}
 </TableCell>
 </TableRow>
 )
 })}
 </TableBody>
 </Table>
 </div>
 </Card>
 </div>
 </PermissionGate>
 )
}
