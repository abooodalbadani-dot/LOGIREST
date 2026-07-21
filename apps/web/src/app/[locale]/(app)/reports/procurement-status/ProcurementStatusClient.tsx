'use client';

import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useProcurementStatusReport, ProcurementStatusReport } from '@/features/reports/hooks/useReports';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';
import { formatDate, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function ProcurementStatusClient() {
 const t = useTranslations('reports');
 const locale = useLocale();
 const { data, isLoading } = useProcurementStatusReport();

 const columns: ColumnDef<ProcurementStatusReport>[] = [
 {
 accessorKey: 'poNo',
 header: t('table.po_no'),
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono opacity-70">
 {row.getValue('poNo')}
 </span>
 ),
 },
 {
 accessorKey: 'date',
 header: t('table.date'),
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono">
 {formatDate(row.getValue('date'), locale as 'ar' | 'en')}
 </span>
 ),
 },
 {
 accessorKey: 'supplier',
 header: t('table.supplier'),
 },
 {
 accessorKey: 'total',
 header: t('table.total'),
 meta: { numeric: true },
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono font-bold">
 {formatCurrency(row.getValue('total'), row.original.currency, locale as 'ar' | 'en')}
 </span>
 ),
 },
 {
 accessorKey: 'status',
 header: t('table.status'),
 cell: ({ row }) => (
 <StatusBadge 
 status={row.getValue('status')} 
 variant={row.getValue('status') === 'RECEIVED' ? 'success' : 'default'} />
 ),
 },
 ];

 const exportColumns = [
 { header: t('table.po_no'), key: 'poNo', width: 15 },
 { header: t('table.date'), key: 'date', width: 15 },
 { header: t('table.supplier'), key: 'supplier', width: 35 },
 { header: t('table.total'), key: 'total', width: 13 },
 { header: t('table.currency'), key: 'currency', width: 10 },
 { header: t('table.status'), key: 'status', width: 12 },
 ];

 return (
 <div className="min-w-0 gap-6 flex-1 fade-in space-y-8 slide-in-from-bottom-4 animate-in flex-col flex duration-700 w-full">
 <PageHeader 
 title={t('procurement_status')}
 subtitle={t('procurement_status_desc')}
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
 filename="Procurement_Status_Report"
 title={t('procurement_status')}
 exportRoute="/reports/procurement-status/export"
 countCheckParams={{ type: 'procurement-status' }}
 />
 }
 collectionName="reports"
 enableVirtualization={true}
 renderMobileCard={(item: ProcurementStatusReport) => (
 <div className="flex flex-col bg-card border border-border shadow-sm rounded-2xl p-4 transition-all hover:border-brand-gold/30 space-y-3">
  {/* Header: PO No + Status + Date */}
  <div className="flex flex-col gap-1 min-w-0 w-full pb-3 border-b border-border/40 text-start items-start">
   <div className="flex items-center justify-between w-full gap-2">
    <span className="font-mono font-bold text-sm text-foreground" dir="ltr">
     {item.poNo}
    </span>
    {item.status && (
     <StatusBadge 
      status={item.status} 
      variant={item.status === 'RECEIVED' ? 'success' : 'default'} 
     />
    )}
   </div>
   <div className="flex items-center gap-2 mt-1">
    <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
     {formatDate(item.date, locale as 'ar' | 'en')}
    </span>
   </div>
  </div>

  {/* Details Row */}
  <div className="grid grid-cols-2 gap-2 w-full bg-slate-50/70 dark:bg-slate-900/40 border border-border/50 rounded-xl p-3 text-center">
   <div className="flex flex-col gap-1">
    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
     {t('table.supplier')}
    </span>
    <span className="text-xs font-bold text-foreground truncate">
     {item.supplier || '—'}
    </span>
   </div>

   <div className="flex flex-col gap-1 border-s border-border/40 ps-2">
    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
     {t('table.total')}
    </span>
    <span className="font-mono text-xs font-black text-operational-cyan" dir="ltr">
     {formatCurrency(item.total, item.currency, locale as 'ar' | 'en')}
    </span>
   </div>
  </div>
 </div>
 )}
 />
 </div>
 );
}
