"use client"

import * as React from "react";
import { useWarehouses } from "@/features/warehouses/api/useWarehouses";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Clock,
  Warehouse,
  User,
  ClipboardList,
  History,
  Printer,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { StatusTimeline, Status } from "@/components/shared/StatusTimeline";
import { ClientOnlyTime } from "@/components/shared/ClientOnlyTime";
import { Stocktake, StocktakeItem } from "@/features/operations/types/stocktake";

interface StocktakeViewerProps {
  session: Stocktake;
  locale: 'ar' | 'en';
  actions?: React.ReactNode;
}

export function StocktakeViewer({ session, locale, actions }: StocktakeViewerProps) {
  const t = useTranslations('operations.stocktake')
  const common = useTranslations('common')
  const router = useRouter()

  const { data: warehouses } = useWarehouses();
  const warehouse = warehouses?.find(w => w.id === session.warehouse_id);
  const warehouseName = warehouse ? (locale === 'ar' ? warehouse.nameAr : warehouse.nameEn) : (session.warehouse_name || session.warehouse_id);

  return (
    <div className="min-h-screen bg-surface-container-low pb-12 animate-in fade-in duration-500">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-50 w-full glass-header">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex flex-col">
            <Breadcrumb
              items={[
                { label: t('title'), href: `/stocktake` },
                { label: session.session_name },
              ]}
            />
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-title-sm">
                {session.session_name}
              </h1>
              <Badge variant="outline" className="h-6 px-2 text-label-xxs font-semibold uppercase bg-primary/5 text-primary border-none">
                {t(`${session.status.toLowerCase()}_status`)}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {actions}
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4 me-2" />
              {common('print')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-9 rounded-xl text-label-xs font-semibold uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 me-2" />
              {common('back')}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: common('warehouse'), value: warehouseName, icon: Warehouse, color: 'text-primary' },
            { label: t('owner'), value: session.posted_by || common('system'), icon: User, color: 'text-emerald-500' },
            { label: t('items_count'), value: `${session.items.length} ${t('skus')}`, icon: ClipboardList, color: 'text-rose-500' },
            { label: t('last_updated'), value: <ClientOnlyTime date={session.updated_at ?? session.snapshot_at} mode="time" />, icon: Clock, color: 'text-amber-500' },
          ].map((item, idx) => (
            <Card key={idx} className="p-5 bg-surface-container-lowest border-none shadow-sm flex flex-col gap-3 group transition-all rounded-xl relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div className={cn("w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center", item.color)}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-label-xxs font-semibold text-muted-foreground/30 uppercase">{item.label}</span>
              </div>
              <div className="flex flex-col relative z-10">
                <span className="text-title-sm font-semibold text-foreground line-clamp-1">{item.value}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary Table */}
        <Card className="bg-surface-container-lowest border-none shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-body-md font-semibold text-foreground">{t('inventory_manifest')}</h3>
              <p className="text-label-xs font-semibold text-muted-foreground/30 uppercase">{t('items_to_audit')}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12 px-6">{common('item')}</TableHead>
                  <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('snapshot_qty')}</TableHead>
                  <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('counted_qty')}</TableHead>
                  <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('variance')}</TableHead>
                  <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-end h-12 px-6">{common('status_label')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.items.map((item: StocktakeItem) => {
                  const hasCounted = item.counted_qty !== null
                  const variance = item.variance ?? 0

                  return (
                    <TableRow key={item.id} className="hover:bg-surface-container-low/50 transition-colors border-none group">
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-body-md text-foreground group-hover:text-primary transition-colors">{item.item_name}</span>
                          <span className="text-label-xs font-medium text-muted-foreground/50 font-mono" dir="ltr">{item.barcode}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-label-sm font-bold text-muted-foreground/60">
                        {item.snapshot_qty !== null ? `${item.snapshot_qty} ${item.uom}` : common('dash')}
                      </TableCell>
                      <TableCell className="text-center font-mono text-label-sm font-bold text-foreground">
                        {hasCounted ? `${item.counted_qty} ${item.uom}` : common('dash')}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasCounted && item.snapshot_qty !== null ? (
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xl text-label-xs font-bold",
                            variance === 0 ? "bg-emerald-500/10 text-emerald-500" :
                              variance > 0 ? "bg-blue-500/10 text-blue-500" : "bg-red-500/10 text-red-500"
                          )} dir="ltr">
                            {variance > 0 ? '+' : ''}{variance}
                          </div>
                        ) : common('dash')}
                      </TableCell>
                      <TableCell className="text-end px-6">
                        {hasCounted ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-none text-label-xxs font-semibold uppercase h-6">
                            {common('completed')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-surface-container-highest text-muted-foreground/60 border-none text-label-xxs font-semibold uppercase h-6">
                            {common('pending')}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {session.items.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground/40 text-label-xs font-semibold uppercase italic">
                      {t('no_items_in_manifest')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Status Timeline */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm transition-all hover:bg-surface-container-low/50">
          <div className="flex items-center gap-3 mb-10">
            <History className="w-4 h-4 text-primary opacity-20" />
            <h3 className="text-label-xs font-semibold uppercase text-primary/30">{common('audit_trail') || 'Audit Trail'}</h3>
          </div>
          <StatusTimeline
            entries={[
              {
                status: session.status.toLowerCase() as Status,
                at: session.updated_at ?? session.snapshot_at,
                by: session.posted_by || common('system')
              }
            ]}
          />
        </div>
      </div>
    </div>
  )
}
