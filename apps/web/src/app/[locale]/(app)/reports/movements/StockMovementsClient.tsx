'use client';

import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useStockMovementsReport, StockMovementsReport } from '@/features/reports/hooks/useReports';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';
import { formatDate, formatQuantity } from '@/lib/utils';

export default function StockMovementsClient() {
 const t = useTranslations('reports');
 const locale = useLocale() as 'ar' | 'en';
 const { data, isLoading } = useStockMovementsReport();

 const columns: ColumnDef<StockMovementsReport>[] = [
 {
 accessorKey: 'date',
 header: t('table.date'),
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono">
 {formatDate(row.getValue('date'), locale)}
 </span>
 ),
 },
 {
 accessorKey: 'reference',
 header: t('table.reference'),
 },
 {
 accessorKey: 'type',
 header: t('table.type'),
 },
 {
 accessorKey: 'item',
 header: t('table.item'),
 },
 {
 accessorKey: 'qty',
 header: t('table.qty'),
 meta: { numeric: true },
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono">
 {formatQuantity(row.getValue('qty'), locale)}
 </span>
 ),
 },
 {
 accessorKey: 'from',
 header: t('table.from'),
 },
 {
 accessorKey: 'to',
 header: t('table.to'),
 },
 {
 accessorKey: 'user',
 header: t('table.user'),
 },
 ];

 const exportColumns = [
 { header: t('table.date'), key: 'date', width: 20 },
 { header: t('table.reference'), key: 'reference', width: 15 },
 { header: t('table.item'), key: 'item_name', width: 30 },
 { header: t('table.type'), key: 'type', width: 15 },
 { header: t('table.qty'), key: 'qty', width: 10 },
 { header: t('table.user'), key: 'user', width: 20 },
 ];

  return (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
  <PageHeader 
  title={t('movements')}
  subtitle={t('movements_desc')}
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
  filename="Stock_Movements_Report"
  title={t('movements')}
  exportRoute="/reports/movements/export"
  countCheckParams={{ type: 'movements' }}
  />
  }
  collectionName="reports"
  />
  </div>
 );
}
