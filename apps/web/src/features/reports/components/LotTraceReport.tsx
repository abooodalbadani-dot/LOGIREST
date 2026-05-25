'use client';

import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLotTraceReport, type LotTraceReport } from '@/features/reports/hooks/useReports';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';
import { formatDate, formatQuantity } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

function getSourceDocumentHref(row: LotTraceReport): string {
  const type = row.source_document_type.toLowerCase();
  if (type.includes('purchase order') || type.includes('po')) {
    return `/purchase-orders/${row.source_document_id}`;
  }
  if (type.includes('goods receipt') || type.includes('grn')) {
    return `/goods-receipts/${row.source_document_id}`;
  }
  if (type.includes('transfer')) {
    return `/transfers/${row.source_document_id}`;
  }
  return '#';
}

export default function LotTraceReportClient() {
  const t = useTranslations('reports');
  const locale = useLocale() as 'ar' | 'en';
  const { data, isLoading } = useLotTraceReport();

  const columns: ColumnDef<LotTraceReport>[] = [
    {
      accessorKey: 'lot_number',
      header: t('lot_trace_table.lot_number'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-amber-400 font-semibold">
          {row.getValue('lot_number')}
        </span>
      ),
    },
    {
      accessorKey: 'item',
      header: t('lot_trace_table.item'),
    },
    {
      accessorKey: 'received_date',
      header: t('lot_trace_table.received_date'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono">
          {formatDate(row.getValue('received_date'), locale)}
        </span>
      ),
    },
    {
      accessorKey: 'expiry_date',
      header: t('lot_trace_table.expiry_date'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono">
          {formatDate(row.getValue('expiry_date'), locale)}
        </span>
      ),
    },
    {
      accessorKey: 'quantity',
      header: t('lot_trace_table.quantity'),
      meta: { numeric: true },
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono">
          {formatQuantity(row.getValue('quantity'), locale)}
        </span>
      ),
    },
    {
      accessorKey: 'source_document',
      header: t('lot_trace_table.source_document'),
      cell: ({ row }) => {
        const doc = row.original;
        const href = getSourceDocumentHref(doc);
        return (
          <Link
            href={href}
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-500/30 font-mono transition-colors"
          >
            {doc.source_document}
          </Link>
        );
      },
    },
  ];

  const exportColumns = [
    { header: t('lot_trace_table.lot_number'), key: 'lot_number', width: 15 },
    { header: t('lot_trace_table.item'), key: 'item', width: 20 },
    { header: t('lot_trace_table.received_date'), key: 'received_date', width: 15 },
    { header: t('lot_trace_table.expiry_date'), key: 'expiry_date', width: 15 },
    { header: t('lot_trace_table.quantity'), key: 'quantity', width: 10 },
    { header: t('lot_trace_table.source_document'), key: 'source_document', width: 15 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={t('lot_trace')}
        subtitle={t('lot_trace_desc')}
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
            filename="Lot_Trace_Report"
            title={t('lot_trace')}
            exportRoute="/reports/lot-trace/export"
            countCheckParams={{ type: 'lot-trace' }}
          />
        }
        collectionName="reports"
        enableVirtualization={true}
        containerHeight="600px"
      />
    </div>
  );
}
