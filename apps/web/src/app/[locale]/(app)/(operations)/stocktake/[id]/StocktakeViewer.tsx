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
 History,
 Search
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentLineItemTable, type LineItem } from "@/components/shared/DocumentLineItemTable/DocumentLineItemTable";
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
 const tp = useTranslations('print')
 const router = useRouter()
 
 const [manifestSearch, setManifestSearch] = React.useState('')
 const { data: warehousesData } = useWarehouses(); const warehouses = warehousesData?.data || [];
 const warehouse = warehouses?.find(w => w.id === session.warehouseId);
 const warehouseName = warehouse ? warehouse.name : (session.warehouseName || session.warehouseId);

 const filteredItems = React.useMemo(() => {
  if (!manifestSearch) return session.items
  const q = manifestSearch.toLowerCase()
  return session.items.filter(item =>
   item.itemName.toLowerCase().includes(q) || item.barcode?.includes(q)
  )
 }, [session.items, manifestSearch])

 interface StocktakeLineItem extends LineItem {
  snapshotQty: number | null;
  countedQty: number | null;
  variance: number | null;
  uom: string;
 }

 const tableLines = React.useMemo<StocktakeLineItem[]>(() => {
  return filteredItems.map((item) => ({
   id: item.id,
   item: {
    id: item.itemId,
    code: item.barcode || '',
    nameEn: item.itemName,
    nameAr: item.itemName,
    primaryUom: { code: item.uom }
   },
   qty: item.countedQty ?? 0,
   uomId: '',
   lot: null,
   snapshotQty: item.snapshotQty,
   countedQty: item.countedQty,
   variance: item.variance,
   uom: item.uom,
  }));
 }, [filteredItems]);

 return (
  <div className="min-h-screen bg-card border border-border shadow-sm pb-12 animate-in fade-in duration-500 print:bg-card print:pb-0">
   {/* Print-Only Report Header */}
   <div className="print-only print-header p-6 border-b-2 border-gray-300 mb-6">
    <div className="flex justify-between items-start">
     <div>
      <h1 className="text-2xl font-bold uppercase">{tp('stocktake_report_title')}</h1>
      <p className="text-sm text-muted-foreground mt-1">{session.sessionName}</p>
     </div>
     <div className="text-end text-sm text-muted-foreground">
      <p>{session.snapshotAt ? format(new Date(session.snapshotAt), 'PPP') : ''}</p>
     </div>
    </div>
   </div>
   <StickyGlassHeader
    onBack={() => router.back()}
    title={
     <div className="flex flex-col gap-0.5">
      <Breadcrumb
       items={[
        { label: t('title'), href: `/stocktake` },
        { label: session.sessionName },
       ]}
      />
      <span>{session.sessionName}</span>
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
      { label: t('owner'), value: session.postedBy || common('system'), icon: User, color: 'text-emerald-500' },
      { label: t('items_count'), value: `${session.items.length} ${t('skus')}`, icon: ClipboardList, color: 'text-rose-500' },
      { label: t('last_updated'), value: <ClientOnlyTime date={session.updatedAt ?? session.snapshotAt} mode="time" />, icon: Clock, color: 'text-amber-500' },
     ].map((item, idx) => (
      <Card key={idx} className="p-5 bg-card border border-border shadow-sm border-none shadow-sm flex flex-col gap-3 group transition-all rounded-xl relative overflow-hidden">
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
    <Card className="bg-card border border-border shadow-sm border-none shadow-sm rounded-2xl overflow-hidden print:bg-card print:shadow-none print:rounded-none">
     <div className="p-6 flex items-center justify-between print:px-0">
      <div className="space-y-1">
       <h3 className="text-body-md font-semibold text-foreground">{t('inventory_manifest')}</h3>
       <p className="text-label-xs font-semibold text-muted-foreground/30 uppercase">{t('items_to_audit')}</p>
      </div>
     </div>
     <div className="px-6 pb-3 flex flex-col gap-3 print-hidden">
      <div className="relative">
       <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
       <input
        type="text"
        value={manifestSearch}
        onChange={(e) => setManifestSearch(e.target.value)}
        placeholder={t('manifest_search_placeholder')}
        className="w-full ps-9 pe-3 py-2 rounded-xl bg-card border border-border shadow-sm border border-border/40 text-label-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
       />
      </div>
      {manifestSearch && (
       <p className="text-label-xs font-semibold text-muted-foreground/50">
        {t('manifest_search_count', { filtered: filteredItems.length, total: session.items.length })}
       </p>
      )}
     </div>
     {filteredItems.length === 0 && manifestSearch ? (
      <div className="px-6 pb-8 text-center print:px-0">
       <p className="text-label-sm text-muted-foreground/40">{common('no_results') || 'No matching items'}</p>
      </div>
     ) : (
      <DocumentLineItemTable<StocktakeLineItem>
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
     )}
    </Card>
    
    {/* Status Timeline */}
    <div className="bg-card border border-border shadow-sm p-8 rounded-2xl shadow-sm transition-all hover:bg-card border border-border shadow-sm/50 print-hidden">
     <div className="flex items-center gap-3 mb-10">
      <History className="w-4 h-4 text-primary opacity-20" />
      <h3 className="text-label-xs font-semibold uppercase text-primary/30">{common('audit_trail') || 'Audit Trail'}</h3>
     </div>
     {(() => {
       const timeline = (session.auditLog ?? []).map(log => ({
        status: log.status.toLowerCase() as Status,
        at: log.createdAt,
        by: log.userName || common('system_user'),
       }));
       if (timeline.length === 0) {
        timeline.push({ status: 'draft' as Status, at: session.createdAt ?? session.snapshotAt, by: session.startedBy || common('system_user') });
       }
       return <StatusTimeline entries={timeline} />;
      })()}
    </div>
   </div>
  </div>
 )
}
