'use client';

import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAvailableInventoryReport, AvailableInventoryReport } from '@/features/reports/hooks/useReports';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';
import { formatQuantity } from '@/lib/utils';

export default function AvailableInventoryClient() {
 const t = useTranslations('reports');
 const locale = useLocale() as 'ar' | 'en';
 const { data: paginatedData, isLoading } = useAvailableInventoryReport();
 const data = paginatedData?.data;

 const columns: ColumnDef<AvailableInventoryReport>[] = [
 {
 accessorKey: 'sku',
 header: t('table.sku'),
 },
 {
 accessorKey: 'name',
 header: t('table.name'),
 },
 {
 accessorKey: 'category',
 header: t('table.category'),
 },
 {
 accessorKey: 'qtyPhysical',
 header: t('table.qty_physical'),
 meta: { numeric: true },
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono">
 {formatQuantity(row.original.qtyPhysical, locale)}
 </span>
 ),
 },
 {
 accessorKey: 'qtyReserved',
 header: t('table.qty_reserved'),
 meta: { numeric: true },
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono">
 {formatQuantity(row.original.qtyReserved, locale)}
 </span>
 ),
 },
 {
 accessorKey: 'qtyAvailable',
 header: t('table.qty_available'),
 meta: { numeric: true },
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono">
 {formatQuantity(row.original.qtyAvailable, locale)}
 </span>
 ),
 },
 ];

 const exportColumns = [
 { header: t('table.sku'), key: 'sku', width: 12 },
 { header: t('table.name'), key: 'name', width: 35 },
 { header: t('table.category'), key: 'category', width: 20 },
 { header: t('table.qty_physical'), key: 'qtyPhysical', width: 11 },
 { header: t('table.qty_reserved'), key: 'qtyReserved', width: 11 },
 { header: t('table.qty_available'), key: 'qtyAvailable', width: 11 },
 ];

 return (
 <div className="min-w-0 gap-6 flex-1 fade-in space-y-8 slide-in-from-bottom-4 animate-in flex-col flex duration-700 w-full">
 <PageHeader 
 title={t('available_inventory')}
 subtitle={t('available_inventory_desc')}
 backHref="/reports"
 />

 <DataTable
 data={data || []}
 columns={columns}
 isLoading={isLoading}
 exportComponent={
 <ReportExportMenu 
 columns={exportColumns}
 data={data || []}
 filename="Available_Inventory_Report"
 title={t('available_inventory')}
 exportRoute="/reports/available-inventory/export"
 countCheckParams={{ type: 'available-inventory' }}
 />
 }
 collectionName="reports"
 enableVirtualization={true}
 renderMobileCard={(item: AvailableInventoryReport) => (
  <div className="flex flex-col bg-card border border-border shadow-sm rounded-2xl p-4 transition-all hover:border-brand-gold/30 space-y-3">
   {/* Header: Name + Category + SKU */}
   <div className="flex flex-col gap-1 min-w-0 w-full pb-3 border-b border-border/40 text-start items-start">
    <div className="flex items-center justify-between w-full gap-2">
     <span className="text-sm font-bold text-foreground truncate" title={item.name}>
      {item.name}
     </span>
     {item.category && (
      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md uppercase shrink-0">
       {item.category}
      </span>
     )}
    </div>
    <span className="font-mono font-bold text-[11px] bg-surface-container-highest/60 border border-surface-variant/10 px-2 py-0.5 rounded text-muted-foreground text-start rtl:text-right ltr:text-left" dir="ltr">
     {item.sku}
    </span>
   </div>

   {/* Quantities Row (Physical, Reserved, Available) */}
   <div className="grid grid-cols-3 gap-2 w-full bg-slate-50/70 dark:bg-slate-900/40 border border-border/50 rounded-xl p-3 text-center">
    {/* Physical */}
    <div className="flex flex-col gap-1">
     <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
      {t('table.qty_physical')}
     </span>
     <span className="font-mono text-xs font-bold text-foreground" dir="ltr">
      {formatQuantity(item.qtyPhysical, locale)}
     </span>
    </div>

    {/* Reserved */}
    <div className="flex flex-col gap-1 border-x border-border/40 px-1">
     <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
      {t('table.qty_reserved')}
     </span>
     <span className="font-mono text-xs font-bold text-amber-500" dir="ltr">
      {formatQuantity(item.qtyReserved, locale)}
     </span>
    </div>

    {/* Available */}
    <div className="flex flex-col gap-1">
     <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
      {t('table.qty_available')}
     </span>
     <span className="font-mono text-xs font-black text-operational-cyan" dir="ltr">
      {formatQuantity(item.qtyAvailable, locale)}
     </span>
    </div>
   </div>
  </div>
 )}
 />
 </div>
 );
}
