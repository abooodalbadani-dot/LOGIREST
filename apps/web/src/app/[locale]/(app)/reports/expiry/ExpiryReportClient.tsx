'use client';

import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useExpiryReport, ExpiryReport } from '@/features/reports/hooks/useReports';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatNumber } from '@/utils/currency';

export default function ExpiryReportClient() {
 const t = useTranslations('reports');
 const locale = useLocale();
 const { data, isLoading } = useExpiryReport();

 const columns: ColumnDef<ExpiryReport>[] = [
 {
 accessorKey: 'sku',
 header: t('table.sku'),
 },
 {
 accessorKey: 'name',
 header: t('table.name'),
 },
 {
 accessorKey: 'lotNo',
 header: t('table.lot_no'),
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono opacity-70 uppercase">
 {row.getValue('lotNo')}
 </span>
 ),
 },
 {
 accessorKey: 'expiryDate',
 header: t('table.expiry_date'),
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono">
 {formatDate(row.getValue('expiryDate'), locale as 'ar' | 'en')}
 </span>
 ),
 },
 {
 accessorKey: 'daysRemaining',
 header: t('table.days_remaining'),
 meta: { numeric: true },
 cell: ({ row }) => {
 const days = row.getValue('daysRemaining') as number;
 return (
 <span dir="ltr" className="font-mono font-bold">
 {formatNumber(days, locale as 'ar' | 'en')}
 </span>
 );
 }
 },
 {
 accessorKey: 'status',
 header: t('table.status'),
 cell: ({ row }) => (
 <StatusBadge 
 status={row.getValue('status')} 
 variant={row.getValue('status') === 'EXPIRED' ? 'error' : 'warning'} />
 ),
 },
 ];

  const exportColumns = [
  { header: t('table.sku'), key: 'sku', width: 12 },
  { header: t('table.name'), key: 'name', width: 35 },
  { header: t('table.lot_no'), key: 'lotNo', width: 15 },
  { header: t('table.expiry_date'), key: 'expiryDate', width: 15 },
  { header: t('table.qty'), key: 'qtyOnHand', width: 10 },
  { header: t('table.status'), key: 'status', width: 13 },
  ];

 return (
 <div className="min-w-0 gap-6 flex-1 fade-in space-y-8 slide-in-from-bottom-4 animate-in flex-col flex duration-700 w-full">
 <PageHeader 
 title={t('expiry')}
 subtitle={t('expiry_desc')}
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
 filename="Expiry_Report"
 title={t('expiry')}
 exportRoute="/reports/expiry/export"
 countCheckParams={{ type: 'expiry' }}
 />
 }
 collectionName="reports"
 enableVirtualization={true}
 renderMobileCard={(item: ExpiryReport) => (
  <div className="flex flex-col bg-card border border-border shadow-sm rounded-2xl p-4 transition-all hover:border-brand-gold/30 space-y-3">
   {/* Header: Name + Status + SKU & Lot */}
   <div className="flex flex-col gap-1 min-w-0 w-full pb-3 border-b border-border/40 text-start items-start">
    <div className="flex items-center justify-between w-full gap-2">
     <span className="text-sm font-bold text-foreground truncate" title={item.name}>
      {item.name}
     </span>
     {item.status && (
      <StatusBadge 
       status={item.status} 
       variant={item.status === 'EXPIRED' ? 'error' : 'warning'} 
      />
     )}
    </div>
    <div className="flex items-center gap-2 mt-1">
     <span className="font-mono font-bold text-[11px] bg-surface-container-highest/60 border border-surface-variant/10 px-2 py-0.5 rounded text-muted-foreground text-start rtl:text-right ltr:text-left" dir="ltr">
      {item.sku}
     </span>
     {item.lotNo && (
      <span className="font-mono text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/40" dir="ltr">
       {item.lotNo}
      </span>
     )}
    </div>
   </div>

   {/* Details Row */}
   <div className="grid grid-cols-2 gap-2 w-full bg-slate-50/70 dark:bg-slate-900/40 border border-border/50 rounded-xl p-3 text-center">
    <div className="flex flex-col gap-1">
     <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
      {t('table.expiry_date')}
     </span>
     <span className="font-mono text-xs font-bold text-foreground" dir="ltr">
      {formatDate(item.expiryDate, locale as 'ar' | 'en')}
     </span>
    </div>

    <div className="flex flex-col gap-1 border-s border-border/40 ps-2">
     <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
      {t('table.days_remaining')}
     </span>
     <span className={`font-mono text-xs font-black ${item.daysRemaining <= 0 ? 'text-red-500' : 'text-amber-500'}`} dir="ltr">
      {formatNumber(item.daysRemaining, locale as 'ar' | 'en')}
     </span>
    </div>
   </div>
  </div>
 )}
 />
 </div>
 );
}
