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
 { header: t('table.sku'), key: 'sku', width: 15 },
 { header: t('table.name'), key: 'name', width: 30 },
 { header: t('table.category'), key: 'category', width: 20 },
 { header: t('table.qty_physical'), key: 'qtyPhysical', width: 15 },
 { header: t('table.qty_reserved'), key: 'qtyReserved', width: 15 },
 { header: t('table.qty_available'), key: 'qtyAvailable', width: 15 },
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
 />
 </div>
 );
}
