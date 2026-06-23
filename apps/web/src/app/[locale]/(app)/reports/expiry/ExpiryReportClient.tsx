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
 />
 </div>
 );
}
