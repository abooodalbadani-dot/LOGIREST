'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState, useMemo } from 'react';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useWacHistory } from '@/features/reports/hooks/useWacHistory';
import { useItems } from '@/features/items/hooks/useItems';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';
import { formatDate, formatQuantity } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

interface WacHistoryRow {
  id: string;
  date: string | null;
  document_type: string;
  document_number: string;
  document_id: string;
  item: string;
  quantity: number;
  unit_cost: number;
  new_wac: number;
}

function getDocumentHref(row: WacHistoryRow): string {
  const type = (row.document_type || '').toLowerCase();
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

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');

  const { data: itemsData, isLoading: isLoadingItems } = useItems({ search: itemSearch });
  const items = useMemo(() => {
    return (itemsData?.data || []).map((item) => ({
      id: item.id,
      code: item.code,
      barcode: item.barcode,
      name_en: item.nameEn,
      name_ar: item.nameAr,
    }));
  }, [itemsData]);

  const { data: wacHistoryData, isLoading: isLoadingWac } = useWacHistory(selectedItemId);

  const mappedData = useMemo(() => {
    if (!wacHistoryData) return [];
    return wacHistoryData.map((d, index) => ({
      id: d.documentId || String(index),
      date: d.postedAt,
      document_type: d.documentType || 'N/A',
      document_number: d.documentId || 'N/A',
      document_id: d.documentId || '',
      item: d.item ? `${d.item.name} (${d.item.sku})` : 'N/A',
      quantity: d.quantity || 0,
      unit_cost: d.unitPrice || 0,
      new_wac: d.newWac,
    }));
  }, [wacHistoryData]);

  const columns: ColumnDef<WacHistoryRow>[] = [
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

      <div className="p-6 rounded-3xl border border-border-muted/20 bg-surface-container-low/90 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 max-w-md">
          <label className="text-label-xs font-bold text-muted-foreground/60 uppercase tracking-wider block mb-2">
            {t('wac_history_table.item')}
          </label>
          <SmartCombobox
            items={items}
            value={selectedItemId || ''}
            onSelect={(item) => setSelectedItemId(item.id as string)}
            onSearchChange={setItemSearch}
            placeholder={t('search_placeholder') || 'Select item...'}
            isLoading={isLoadingItems}
          />
        </div>
      </div>

      {selectedItemId ? (
        <DataTable
          data={mappedData}
          columns={columns}
          isLoading={isLoadingWac}
          exportComponent={
            <ReportExportMenu
              columns={exportColumns}
              data={mappedData}
              filename="WAC_History_Report"
              title={t('wac_history')}
              exportRoute="/reports/wac-history/export"
              countCheckParams={{ type: 'wac-history', itemId: selectedItemId }}
            />
          }
          collectionName="reports"
          enableVirtualization={true}
          containerHeight="600px"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border-muted/20 rounded-3xl bg-surface-container-low/40">
          <p className="text-muted-foreground/50 font-semibold text-body-md uppercase tracking-wider">
            Please select an item to view its cost history timeline.
          </p>
        </div>
      )}
    </div>
  );
}
