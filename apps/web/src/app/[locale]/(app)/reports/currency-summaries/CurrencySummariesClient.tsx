'use client';

import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useCurrencySummaryReport, CurrencySummaryReport } from '@/features/reports/hooks/useReports';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';
import { formatCurrency, formatRate } from '@/utils/currency';
import { useBaseCurrency } from '@/hooks/useBaseCurrency';

export default function CurrencySummariesClient() {
 const t = useTranslations('reports');
 const locale = useLocale();
 const { currency: baseCurrency } = useBaseCurrency();
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
 accessorKey: 'totalBase',
 header: t('table.total_base', { currency: baseCurrency }),
 meta: { numeric: true },
 cell: ({ row }) => formatCurrency(row.getValue('totalBase'), baseCurrency, locale as 'ar' | 'en'),
 },
 {
 accessorKey: 'lastRate',
 header: t('table.last_rate'),
 meta: { numeric: true },
 cell: ({ row }) => formatRate(row.getValue('lastRate'), locale as 'ar' | 'en', 6),
 },
 ];

 const exportColumns = [
 { header: t('table.currency'), key: 'currency', width: 15 },
 { header: t('table.total'), key: 'total', width: 20 },
 { header: t('table.last_rate'), key: 'lastRate', width: 15 },
 { header: t('table.total_base', { currency: baseCurrency }), key: 'totalBase', width: 20 },
 ];

 return (
 <div className="min-w-0 gap-6 flex-1 fade-in space-y-8 slide-in-from-bottom-4 animate-in flex-col flex duration-700 w-full">
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
 countCheckParams={{ type: 'currency-summaries' }}
 />
 }
 collectionName="reports"
 />
 </div>
 );
}
