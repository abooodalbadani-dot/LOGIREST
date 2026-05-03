'use client';

import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useStocktakeVarianceReport, StocktakeVarianceReport } from '@/features/reports/hooks/useReports';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';
import { formatQuantity } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function StocktakeVarianceClient() {
 const t = useTranslations('reports');
 const locale = useLocale() as 'ar' | 'en';
 const { data, isLoading } = useStocktakeVarianceReport();

 const columns: ColumnDef<StocktakeVarianceReport>[] = [
 {
 accessorKey: 'sku',
 header: t('table.sku'),
 },
 {
 accessorKey: 'name',
 header: t('table.name'),
 },
 {
 accessorKey: 'system_qty',
 header: t('table.system_qty'),
 meta: { numeric: true },
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono">
 {formatQuantity(row.original.system_qty, locale)}
 </span>
 ),
 },
 {
 accessorKey: 'counted_qty',
 header: t('table.counted_qty'),
 meta: { numeric: true },
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono">
 {formatQuantity(row.original.counted_qty, locale)}
 </span>
 ),
 },
 {
 accessorKey: 'variance',
 header: t('table.variance'),
 meta: { numeric: true },
 cell: ({ row }) => {
 const val = row.getValue('variance') as number;
 return (
 <span 
 dir="ltr" 
 className={cn(
 "font-mono",
 val < 0 ? 'text-destructive font-bold' : val > 0 ? 'text-operational-cyan font-bold' : ''
 )}
 >
 {val > 0 ? `+${formatQuantity(val, locale)}` : formatQuantity(val, locale)}
 </span>
 );
 }
 },
 {
 accessorKey: 'reason',
 header: t('table.reason'),
 },
 ];

 const exportColumns = [
 { header: t('table.sku'), key: 'sku', width: 15 },
 { header: t('table.item'), key: 'item_name', width: 30 },
 { header: t('table.system_qty'), key: 'system_qty', width: 15 },
 { header: t('table.counted_qty'), key: 'counted_qty', width: 15 },
 { header: t('table.variance'), key: 'variance', width: 15 },
 { header: t('table.reason'), key: 'reason', width: 30 },
 ];

 return (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
 <PageHeader 
 title={t('stocktake_variance')}
 subtitle={t('stocktake_variance_desc')}
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
 filename="Stocktake_Variance_Report"
 title={t('stocktake_variance')}
 />
 }
 collectionName="reports"
 />
 </div>
 );
}
