'use client';

import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useCurrencySummaryReport, CurrencySummaryReport } from '@/features/reports/hooks/useReports';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';
import { formatCurrency, formatRate } from '@/utils/currency';
import { useAdminSettings } from '@/features/admin/hooks/useAdminSettings';

export default function CurrencySummariesClient() {
  const t = useTranslations('reports');
  const locale = useLocale();
  const { data: settings } = useAdminSettings();
  const baseCurrency = settings?.base_currency || 'SAR';
  const { data, isLoading } = useCurrencySummaryReport();

  const columns: ColumnDef<CurrencySummaryReport>[] = [
  {
  accessorKey: 'currency',
  header: t('table.currency'),
  meta: { numeric: true },
  },
  {
  accessorKey: 'total',
  header: t('table.total'),
  meta: { numeric: true },
  cell: ({ row }) => formatCurrency(row.getValue('total'), row.original.currency, locale as 'ar' | 'en'),
  },
  {
  accessorKey: 'total_base',
  header: t('table.total_base'),
  meta: { numeric: true },
  cell: ({ row }) => formatCurrency(row.getValue('total_base'), baseCurrency, locale as 'ar' | 'en'),
  },
  {
  accessorKey: 'last_rate',
  header: t('table.last_rate'),
  meta: { numeric: true },
  cell: ({ row }) => formatRate(row.getValue('last_rate'), locale as 'ar' | 'en', 6),
  },
  ];

 const exportColumns = [
 { header: t('table.currency'), key: 'currency_code', width: 15 },
 { header: t('table.total'), key: 'total_original', width: 20 },
 { header: t('table.last_rate'), key: 'exchange_rate', width: 15 },
 { header: t('table.total_base'), key: 'total_sar', width: 20 },
 ];

 return (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
 <PageHeader 
 title={t('currency_summaries')}
 subtitle={t('currency_summaries_desc')}
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
 filename="Currency_Summary_Report"
 title={t('currency_summaries')}
 />
 }
 collectionName="reports"
 />
 </div>
 );
}
