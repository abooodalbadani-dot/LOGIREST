"use client"

import * as React from "react";
import { useStocktake, usePostStocktake, useApproveStocktake } from "@/features/operations/api/useStocktakes";
import { useWarehouses } from "@/features/warehouses/api/useWarehouses";
import { useWarehouseLock } from "@/hooks/useWarehouseLock";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { format } from "date-fns";
import { 
  BarChart3, 
  Clock, 
  Warehouse, 
  User, 
  ClipboardList, 
  Play,
  CheckCircle2,
  AlertTriangle 
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { PostConfirmDialog } from "@/components/shared/PostConfirmDialog";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { LockBanner } from "@/components/shared/LockBanner";

export function StocktakeDetailClient({ id, locale }: { id: string, locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.stocktake')
  const common = useTranslations('common')
  const router = useRouter()
  
  const { data: session, isLoading, error } = useStocktake(id);
  const { data: warehouses } = useWarehouses();
  const postStocktake = usePostStocktake();
  const approveStocktake = useApproveStocktake();
  const { data: lockState } = useWarehouseLock(session?.warehouseId ?? null);

  if (isLoading) return <LoadingSkeleton />
  if (error || !session) return <ErrorState onRetry={() => window.location.reload()} />

  const warehouse = warehouses?.find(w => w.id === session.warehouseId);
  const warehouseName = warehouse ? (locale === 'ar' ? warehouse.nameAr : warehouse.nameEn) : (session.warehouseName || session.warehouseId);

  const handlePost = async () => {
    try {
      await postStocktake.mutateAsync(id);
      toast.success(t('posted_success'));
    } catch {
      toast.error(common('error'));
    }
  };

  const handleApprove = async () => {
    try {
      await approveStocktake.mutateAsync({ id });
      toast.success(t('approved_success'));
    } catch {
      toast.error(common('error'));
    }
  };

  const isCounting = ['STARTED', 'COUNTING'].includes(session.status);
  const isReviewing = ['COUNTING_COMPLETED', 'VarianceSubmitted'].includes(session.status);
  const isApproved = session.status === 'APPROVED';
  const isRejected = session.status === 'REJECTED';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: common('sidebar.operations'), href: `/stocktake` },
            { label: t('title'), href: `/stocktake` },
            { label: session.sessionName },
          ]}
        />

        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black tracking-tight text-3xl">
                  {session.sessionName}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {t(`${session.status.toLowerCase() as Lowercase<typeof session.status>}_status`)}
                  </Badge>
                  <span className="text-muted-foreground/20 text-[10px]">|</span>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    <Clock className="w-3 h-3" />
                    <span dir="ltr">{format(new Date(session.createdAt), 'yyyy-MM-dd HH:mm')}</span>
                  </div>
                </div>
              </div>
            </div>
          }
          actions={
            <div className="flex items-center gap-3">
              <PermissionGate action="edit" resource="operations_stocktake">
                {session.status === 'DRAFT' && (
                  <Button onClick={() => router.push(`/stocktake/${id}/start`)} className="primary-gradient">
                    <Play className="w-4 h-4 me-2 fill-current" />
                    {t('start_session')}
                  </Button>
                )}
                {isCounting && (
                  <Button onClick={() => router.push(`/stocktake/${id}/count`)} className="primary-gradient">
                    <ClipboardList className="w-4 h-4 me-2" />
                    {t('go_to_count')}
                  </Button>
                )}
                {isReviewing && (
                  <Button onClick={() => router.push(`/stocktake/${id}/variance`)} className="primary-gradient">
                    <AlertTriangle className="w-4 h-4 me-2" />
                    {t('review_variance')}
                  </Button>
                )}
              </PermissionGate>

              <PermissionGate action="approve" resource="operations_stocktake">
                {session.status === 'VarianceSubmitted' && (
                  <Button onClick={() => router.push(`/stocktake/${id}/approve`)} className="primary-gradient">
                    <CheckCircle2 className="w-4 h-4 me-2" />
                    {t('review_approval')}
                  </Button>
                )}
              </PermissionGate>

              <PermissionGate action="post" resource="operations_stocktake">
                {isApproved && (
                  <Button onClick={() => router.push(`/stocktake/${id}/post`)} className="primary-gradient">
                    <CheckCircle2 className="w-4 h-4 me-2" />
                    {t('go_to_post')}
                  </Button>
                )}
              </PermissionGate>
            </div>
          }
        />
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: common('warehouse'), value: warehouseName, icon: Warehouse, color: 'text-primary' },
          { label: t('owner'), value: session.postedBy || common('system'), icon: User, color: 'text-emerald-500' },
          { label: t('items_count'), value: `${session.items.length} ${t('skus')}`, icon: ClipboardList, color: 'text-rose-500' },
          { label: t('last_updated'), value: format(new Date(session.updatedAt), 'HH:mm'), icon: Clock, color: 'text-amber-500' },
        ].map((item, idx) => (
          <Card key={idx} className="p-8 bg-surface-container-low border-none shadow-none flex flex-col gap-5 group hover:bg-surface-container-medium transition-all rounded-[1.5rem] relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div className={cn("w-12 h-12 rounded-2xl bg-current/10 flex items-center justify-center", item.color)}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">{item.label}</span>
            </div>
            <div className="flex flex-col relative z-10">
              <span className="text-xl font-black tracking-tight text-foreground">{item.value}</span>
            </div>
            <div className={cn("absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity", item.color)}>
              <item.icon className="w-full h-full" />
            </div>
          </Card>
        ))}
      </div>

      {['STARTED', 'COUNTING', 'VarianceSubmitted'].includes(session.status) && (
        <LockBanner lockState={lockState} />
      )}

      {/* Summary Table */}
      <Card className="bg-surface-container-low border-none shadow-none rounded-[2rem] overflow-hidden">
        <div className="p-10 bg-white/[0.01] flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight text-foreground">{t('inventory_manifest')}</h3>
            <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">{t('items_to_audit')}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 h-12 px-10">{common('item')}</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center h-12">{t('snapshot_qty')}</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center h-12">{t('counted_qty')}</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center h-12">{t('variance')}</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-end h-12 px-10">{common('status_label')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.items.map((item) => {
                const hasCounted = item.countedQty !== undefined
                const variance = item.variance ?? 0
                const showSnapshot = !isCounting // Hide snapshot during counting for integrity
                
                return (
                  <TableRow key={item.id} className="hover:bg-white/[0.01] transition-colors border-none group">
                    <TableCell className="px-10 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-foreground group-hover:text-primary transition-colors">{item.itemName}</span>
                        <span className="text-[10px] font-black text-muted-foreground/40 font-mono tracking-tighter" dir="ltr">{item.barcode}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono font-black text-muted-foreground/60">
                      {showSnapshot ? `${item.snapshotQty} ${item.uom}` : common('dash')}
                    </TableCell>
                    <TableCell className="text-center font-mono font-black text-foreground">
                      {hasCounted ? `${item.countedQty} ${item.uom}` : common('dash')}
                    </TableCell>
                    <TableCell className="text-center">
                      {showSnapshot && hasCounted ? (
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-tight",
                          variance === 0 ? "bg-emerald-500/10 text-emerald-500" : 
                          variance > 0 ? "bg-blue-500/10 text-blue-500" : "bg-red-500/10 text-red-500"
                        )} dir="ltr">
                          {variance > 0 ? '+' : ''}{variance}
                        </div>
                      ) : common('dash')}
                    </TableCell>
                    <TableCell className="text-end px-10">
                      {hasCounted ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">
                          {common('completed')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-white/[0.03] text-muted-foreground/40 border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">
                          {common('pending')}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {session.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                    {t('no_items_in_manifest')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

