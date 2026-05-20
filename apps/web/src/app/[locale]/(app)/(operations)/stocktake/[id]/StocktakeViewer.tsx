"use client"

import * as React from "react";
import { useWarehouses } from "@/features/warehouses/hooks/useWarehouses";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { 
  Clock, 
  Warehouse, 
  User, 
  ClipboardList, 
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentLineItemTable } from "@/components/shared/DocumentLineItemTable/DocumentLineItemTable";
import { DocumentExportMenu } from "@/components/shared/DocumentExportMenu";
import { StickyGlassHeader } from "@/components/shared/StickyGlassHeader";
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
  
  const { data: warehousesData } = useWarehouses(); const warehouses = warehousesData?.data || [];
  const warehouse = warehouses?.find(w => w.id === session.warehouse_id);
  const warehouseName = warehouse ? (locale === 'ar' ? warehouse.name_ar : warehouse.name_en) : (session.warehouse_name || session.warehouse_id);

  const tableLines = React.useMemo(() => {
    return session.items.map((item) => ({
      id: item.id,
      item: {
        id: item.item_id,
        code: item.barcode || '',
        name_en: item.item_name,
        name_ar: item.item_name,
        primary_uom: { code: item.uom }
      },
      qty: item.counted_qty ?? 0,
      uom_id: '',
      lot: null,
      snapshotQty: item.snapshot_qty,
      countedQty: item.counted_qty,
      variance: item.variance,
      uom: item.uom,
    }));
  }, [session.items]);

  return (
    <div className="min-h-screen bg-surface-container-low pb-12 animate-in fade-in duration-500">
      <StickyGlassHeader
        onBack={() => router.back()}
        title={
          <div className="flex flex-col gap-0.5">
            <Breadcrumb
              items={[
                { label: t('title'), href: `/stocktake` },
                { label: session.session_name },
              ]}
            />
            <span>{session.session_name}</span>
          </div>
        }
        statusBadge={
          <Badge variant="outline" className="h-6 px-2 text-label-xxs font-semibold uppercase bg-primary/5 text-primary border-none">
            {t(`${session.status.toLowerCase()}_status`)}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-3">
            {actions}
            <DocumentExportMenu />
          </div>
        }
      />

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
          <DocumentLineItemTable
            lines={tableLines}
            locale={locale}
            isReadOnly={true}
            hideLotColumns={true}
            headers={{ qty: t('counted_qty') }}
            renderQty={(line) => (
              line.countedQty !== null ? (
                <span className="font-mono text-label-sm font-bold text-foreground">
                  {line.countedQty}
                </span>
              ) : (
                <span className="text-muted-foreground/30">—</span>
              )
            )}
            renderUom={(line) => (
              <span className="text-label-xs font-semibold text-muted-foreground/40 uppercase">
                {line.uom}
              </span>
            )}
            extraColumns={[
              {
                header: t('snapshot_qty'),
                cell: (line) => (
                  <span className="font-mono text-label-sm font-bold text-muted-foreground/60">
                    {line.snapshotQty !== null ? line.snapshotQty : common('dash')}
                  </span>
                )
              },
              {
                header: t('variance'),
                cell: (line) => {
                  const hasCounted = line.countedQty !== null;
                  const variance = line.variance ?? 0;
                  return hasCounted && line.snapshotQty !== null ? (
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xl text-label-xs font-bold",
                      variance === 0 ? "bg-emerald-500/10 text-emerald-500" : 
                      variance > 0 ? "bg-blue-500/10 text-blue-500" : "bg-red-500/10 text-red-500"
                    )} dir="ltr">
                      {variance > 0 ? '+' : ''}{variance}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/30">—</span>
                  );
                }
              },
              {
                header: common('status_label'),
                cell: (line) => {
                  const hasCounted = line.countedQty !== null;
                  return hasCounted ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-none text-label-xxs font-semibold uppercase h-6">
                      {common('completed')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-surface-container-highest text-muted-foreground/60 border-none text-label-xxs font-semibold uppercase h-6">
                      {common('pending')}
                    </Badge>
                  );
                }
              }
            ]}
          />
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
