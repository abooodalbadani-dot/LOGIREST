'use client';

import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useWacHistoryReport, type WacHistoryReport } from '@/features/reports/hooks/useReports';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';
import { formatDate, formatQuantity } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

function getDocumentHref(row: WacHistoryReport): string {
  const type = row.document_type.toLowerCase();
  if (type.includes('goods receipt') || type.includes('grn')) {
    return `/goods-receipts/${row.document_id}`;
  }
  if (type.includes('adjustment')) {
    return `/adjustments/${row.document_id}`;
  }
  if (type.includes('purchase order') || type.includes('po')) {
    return `/purchase-orders/${row.document_id}`;
  }
  if (type.includes('transfer')) {
    return `/transfers/${row.document_id}`;
  }
  if (type.includes('issue')) {
    return `/issues/${row.document_id}`;
  }
  return '#';
}

export default function WacHistoryReportClient() {
  const t = useTranslations('reports');
  const locale = useLocale() as 'ar' | 'en';
  const { data, isLoading } = useWacHistoryReport();

  const columns: ColumnDef<WacHistoryReport>[] = [
    {
      accessorKey: 'date',
      header: t('wac_history_table.date'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono">
          {formatDate(row.getValue('date'), locale)}
        </span>
      ),
    },
    {
      accessorKey: 'document_type',
      header: t('wac_history_table.document_type'),
    },
    {
      accessorKey: 'document_number',
      header: t('wac_history_table.document_number'),
      cell: ({ row }) => {
        const doc = row.original;
        const href = getDocumentHref(doc);
        return (
          <Link
            href={href}
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-500/30 font-mono transition-colors"
          >
            {doc.document_number}
          </Link>
        );
      },
    },
    {
      accessorKey: 'item',
      header: t('wac_history_table.item'),
    },
    {
      accessorKey: 'quantity',
      header: t('wac_history_table.quantity'),
      meta: { numeric: true },
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono">
          {formatQuantity(row.getValue('quantity'), locale)}
        </span>
      ),
    },
    {
      accessorKey: 'unit_cost',
      header: t('wac_history_table.unit_cost'),
      meta: { numeric: true },
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-amber-400">
          {formatQuantity(row.getValue('unit_cost'), locale)}
        </span>
      ),
    },
    {
      accessorKey: 'new_wac',
      header: t('wac_history_table.new_wac'),
      meta: { numeric: true },
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-cyan-400 font-semibold">
          {formatQuantity(row.getValue('new_wac'), locale)}
        </span>
      ),
    },
  ];

  const exportColumns = [
    { header: t('wac_history_table.date'), key: 'date', width: 20 },
    { header: t('wac_history_table.document_type'), key: 'document_type', width: 15 },
    { header: t('wac_history_table.document_number'), key: 'document_number', width: 15 },
    { header: t('wac_history_table.item'), key: 'item', width: 20 },
    { header: t('wac_history_table.quantity'), key: 'quantity', width: 10 },
    { header: t('wac_history_table.unit_cost'), key: 'unit_cost', width: 10 },
    { header: t('wac_history_table.new_wac'), key: 'new_wac', width: 10 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={t('wac_history')}
        subtitle={t('wac_history_desc')}
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
            filename="WAC_History_Report"
            title={t('wac_history')}
            exportRoute="/reports/wac-history/export"
            countCheckParams={{ type: 'wac-history' }}
          />
        }
        collectionName="reports"
        enableVirtualization={true}
        containerHeight="600px"
      />
    </div>
  );
}
