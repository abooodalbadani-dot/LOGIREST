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
 accessorKey: 'po_no',
 header: t('table.po_no'),
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono opacity-70">
 {row.getValue('po_no')}
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
 { header: t('table.po_no'), key: 'po_number', width: 15 },
 { header: t('table.date'), key: 'date', width: 20 },
 { header: t('table.supplier'), key: 'supplier_name', width: 30 },
 { header: t('table.total'), key: 'total_amount', width: 15 },
 { header: t('table.currency'), key: 'currency', width: 10 },
 { header: t('table.status'), key: 'status', width: 15 },
 ];

 return (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
 />
 }
 collectionName="reports"
 />
 </div>
 );
}
