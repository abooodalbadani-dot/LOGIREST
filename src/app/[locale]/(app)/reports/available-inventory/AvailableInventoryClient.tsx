'use client';

import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAvailableInventoryReport } from '@/features/reports/hooks/useReports';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';

export default function AvailableInventoryClient() {
  const t = useTranslations('reports');
  const { data, isLoading } = useAvailableInventoryReport();

  const columns: ColumnDef<any>[] = [
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
      accessorKey: 'qty_physical',
      header: t('table.qty_physical'),
      meta: { numeric: true },
    },
    {
      accessorKey: 'qty_reserved',
      header: t('table.qty_reserved'),
      meta: { numeric: true },
    },
    {
      accessorKey: 'qty_available',
      header: t('table.qty_available'),
      meta: { numeric: true },
    },
  ];

  const exportColumns = [
    { header: t('table.sku'), key: 'sku', width: 15 },
    { header: t('table.name'), key: 'name', width: 30 },
    { header: t('table.category'), key: 'category', width: 20 },
    { header: t('table.qty_physical'), key: 'qty_physical', width: 15 },
    { header: t('table.qty_reserved'), key: 'qty_reserved', width: 15 },
    { header: t('table.qty_available'), key: 'qty_available', width: 15 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
          />
        }
        collectionName="reports"
      />
    </div>
  );
}
