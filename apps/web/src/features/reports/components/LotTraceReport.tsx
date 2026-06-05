'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState, useMemo } from 'react';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLotTrace } from '@/features/reports/hooks/useLotTrace';
import { useInventoryLots } from '@/features/inventory/hooks/useInventoryLots';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';
import { formatDate, formatQuantity } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

interface LotTraceAllocation {
  documentNumber: string;
  documentType: string;
  quantity: number;
  date: string;
  status: string;
}

export default function LotTraceReportClient() {
  const t = useTranslations('reports');
  const locale = useLocale() as 'ar' | 'en';

  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

  // Fetch active lots
  const { data: lotsData, isLoading: isLoadingLots } = useInventoryLots({ include_expired: true });
  const lots = useMemo(() => {
    return (lotsData?.data || []).map((lot) => ({
      id: lot.id,
      code: lot.lotNumber,
      barcode: undefined,
      name_en: lot.itemName,
      name_ar: lot.itemName,
    }));
  }, [lotsData]);

  // Fetch trace details
  const { data: traceData, isLoading: isLoadingTrace } = useLotTrace(selectedLotId);

  const columns: ColumnDef<LotTraceAllocation>[] = [
    {
      accessorKey: 'documentNumber',
      header: t('lot_trace_table.source_document') || 'Document Number',
      cell: ({ row }) => {
        const doc = row.original;
        const type = (doc.documentType || '').toLowerCase();
        let href = '#';
        if (type.includes('goods receipt') || type.includes('grn')) {
          href = `/goods-receipts/${doc.documentNumber}`;
        } else if (type.includes('transfer')) {
          href = `/transfers/${doc.documentNumber}`;
        } else if (type.includes('issue')) {
          href = `/issues/${doc.documentNumber}`;
        }
        return (
          <Link
            href={href}
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-500/30 font-mono transition-colors"
          >
            {doc.documentNumber}
          </Link>
        );
      },
    },
    {
      accessorKey: 'documentType',
      header: t('lot_trace_table.source_document_type') || 'Document Type',
    },
    {
      accessorKey: 'quantity',
      header: t('lot_trace_table.quantity') || 'Quantity',
      meta: { numeric: true },
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono">
          {formatQuantity(row.getValue('quantity'), locale)}
        </span>
      ),
    },
    {
      accessorKey: 'date',
      header: t('lot_trace_table.received_date') || 'Date',
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono">
          {formatDate(row.getValue('date'), locale)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('lot_trace_table.status') || 'Status',
    },
  ];

  const exportColumns = [
    { header: 'Doc Number', key: 'documentNumber', width: 25 },
    { header: 'Doc Type', key: 'documentType', width: 25 },
    { header: 'Allocated Qty', key: 'quantity', width: 18 },
    { header: 'Transaction Date', key: 'date', width: 25 },
    { header: 'Status', key: 'status', width: 15 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={t('lot_trace')}
        subtitle={t('lot_trace_desc')}
        backHref="/reports"
      />

      <div className="p-6 rounded-3xl border border-border-muted/20 bg-surface-container-low/90 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 max-w-md">
          <label className="text-label-xs font-bold text-muted-foreground/60 uppercase tracking-wider block mb-2">
            {t('lot_trace_table.lot_number') || 'Lot Number'}
          </label>
          <SmartCombobox
            items={lots}
            value={selectedLotId || ''}
            onSelect={(lot) => setSelectedLotId(lot.id as string)}
            placeholder={t('search_placeholder') || 'Select lot...'}
            isLoading={isLoadingLots}
          />
        </div>
      </div>

      {selectedLotId && traceData && (
        <div className="p-6 rounded-3xl border border-border-muted/20 bg-surface-container-low/40 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-md">
          <div>
            <span className="text-label-xxs font-bold text-muted-foreground/50 uppercase tracking-wider block mb-1">
              Lot Number
            </span>
            <span className="text-body-md font-bold text-amber-400 font-mono">
              {traceData.lotNumber}
            </span>
          </div>
          <div>
            <span className="text-label-xxs font-bold text-muted-foreground/50 uppercase tracking-wider block mb-1">
              Item Details
            </span>
            <span className="text-body-md font-bold text-foreground">
              {traceData.itemName} ({traceData.itemSku})
            </span>
          </div>
          <div>
            <span className="text-label-xxs font-bold text-muted-foreground/50 uppercase tracking-wider block mb-1">
              Received Date / Expiry Date
            </span>
            <span className="text-body-md font-bold text-foreground font-mono">
              {formatDate(traceData.receivedDate, locale)} / {traceData.expiryDate ? formatDate(traceData.expiryDate, locale) : 'N/A'}
            </span>
          </div>
        </div>
      )}

      {selectedLotId ? (
        <DataTable
          data={traceData?.allocations || []}
          columns={columns}
          isLoading={isLoadingTrace}
          exportComponent={
            <ReportExportMenu
              columns={exportColumns}
              data={traceData?.allocations || []}
              filename="Lot_Trace_Report"
              title={t('lot_trace')}
              exportRoute="/reports/lot-trace/export"
              countCheckParams={{ type: 'lot-trace', lotId: selectedLotId }}
            />
          }
          collectionName="reports"
          enableVirtualization={true}
          containerHeight="600px"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border-muted/20 rounded-3xl bg-surface-container-low/40">
          <p className="text-muted-foreground/50 font-semibold text-body-md uppercase tracking-wider">
            Please select a lot to view its movement trace.
          </p>
        </div>
      )}
    </div>
  );
}
