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
import { formatDate, formatQuantity, formatCurrency, cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { useBaseCurrency } from '@/hooks/useBaseCurrency';

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
    return `/goods-received/${row.document_id}`;
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
  const { currency: baseCurrency } = useBaseCurrency();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');

  const { data: itemsData, isLoading: isLoadingItems } = useItems({ search: itemSearch });
  const items = useMemo(() => {
    return (itemsData?.data || []).map((item) => ({
      id: item.id,
      code: item.code,
      barcode: item.barcode,
      name: item.name,
      name_en: item.name,
      name_ar: item.name,
    }));
  }, [itemsData]);

  const { data: wacHistoryData, isLoading: isLoadingWac } = useWacHistory(selectedItemId);

  const mappedData = useMemo(() => {
    if (!wacHistoryData) return [];
    return wacHistoryData.map((d, index) => ({
      id: d.documentId || String(index),
      date: d.postedAt,
      document_type: d.documentType || 'N/A',
      document_number: d.documentNumber || d.documentId || 'N/A',
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
        <span dir="ltr" className="font-mono [font-variant-numeric:tabular-nums]">
          {formatDate(row.getValue('date'), locale)}
        </span>
      ),
    },
    {
      accessorKey: 'document_type',
      header: t('wac_history_table.document_type'),
      cell: ({ row }) => {
        const type = row.getValue('document_type') as string;
        if (type === 'GOODS_RECEIVED_NOTE') {
          return (
            <span className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 rounded-full border border-emerald-200 dark:border-emerald-800">
              استلام بضاعة
            </span>
          );
        }
        if (type === 'ADJUSTMENT') {
          return (
            <span className="px-2.5 py-1 text-[11px] font-bold text-orange-700 bg-orange-100 dark:bg-orange-900/30 rounded-full border border-orange-200 dark:border-orange-800">
              تسوية مخزون
            </span>
          );
        }
        if (type === 'TRANSFER') {
          return (
            <span className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800">
              تحويل مخزني
            </span>
          );
        }
        if (type === 'INVENTORY_ISSUE') {
          return (
            <span className="px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-100 dark:bg-red-900/30 rounded-full border border-red-200 dark:border-red-800">
              صرف مخزني
            </span>
          );
        }
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold text-gray-700 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
            {type}
          </span>
        );
      }
    },
    {
      accessorKey: 'document_number',
      header: t('wac_history_table.document_number'),
      cell: ({ row }) => {
        const doc = row.original;
        const href = getDocumentHref(doc);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doc.document_number);
        return (
          <Link
            href={href}
            className={cn(
              isUuid
                ? "inline-block transition-opacity hover:opacity-80"
                : "text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-500/30 font-mono transition-colors"
            )}
          >
            {isUuid ? (
              <span className="font-mono text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded" dir="ltr">
                {doc.document_number.slice(0, 8)}
              </span>
            ) : (
              doc.document_number
            )}
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
        <span dir="ltr" className="font-mono [font-variant-numeric:tabular-nums]">
          {formatQuantity(row.getValue('quantity'), locale)}
        </span>
      ),
    },
    {
      accessorKey: 'unit_cost',
      header: () => (
        <span className="min-w-[140px] inline-block text-end w-full">{t('wac_history_table.unit_cost')}</span>
      ),
      meta: { numeric: true },
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-amber-400 [font-variant-numeric:tabular-nums]">
          {formatCurrency(row.getValue('unit_cost'), baseCurrency, locale)}
        </span>
      ),
    },
    {
      accessorKey: 'new_wac',
      header: () => (
        <span className="min-w-[160px] inline-block text-end w-full">{t('wac_history_table.new_wac')}</span>
      ),
      meta: { numeric: true },
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-cyan-400 font-semibold [font-variant-numeric:tabular-nums]">
          {formatCurrency(row.getValue('new_wac'), baseCurrency, locale)}
        </span>
      ),
    },
  ];

  const exportColumns = [
    { header: t('wac_history_table.date'), key: 'date', width: 15 },
    { header: t('wac_history_table.document_type'), key: 'document_type', width: 15 },
    { header: t('wac_history_table.document_number'), key: 'document_number', width: 18 },
    { header: t('wac_history_table.item'), key: 'item', width: 27 },
    { header: t('wac_history_table.quantity'), key: 'quantity', width: 8 },
    { header: t('wac_history_table.unit_cost'), key: 'unit_cost', width: 9 },
    { header: t('wac_history_table.new_wac'), key: 'new_wac', width: 8 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={t('wac_history')}
        subtitle={t('wac_history_desc')}
        backHref="/reports"
      />

      <div className="p-6 rounded-3xl border border-border-muted/20 bg-card border border-border shadow-sm/90 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center gap-4">
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
          renderMobileCard={(item: WacHistoryRow) => (
            <div className="flex flex-col bg-card border border-border shadow-sm rounded-2xl p-4 transition-all hover:border-brand-gold/30 space-y-3">
              {/* Header: Item + Doc Type & Number */}
              <div className="flex flex-col gap-1 min-w-0 w-full pb-3 border-b border-border/40 text-start items-start">
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="text-sm font-bold text-foreground truncate" title={item.item}>
                    {item.item}
                  </span>
                  {item.document_type && (
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-secondary/60 text-sky-200 uppercase">
                      {item.document_type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                    {formatDate(item.date, locale)}
                  </span>
                  <span className="font-mono text-[11px] bg-surface-container-highest/60 border border-surface-variant/10 px-2 py-0.5 rounded text-muted-foreground" dir="ltr">
                    {item.document_number}
                  </span>
                </div>
              </div>

              {/* Quantities & Costs Grid */}
              <div className="grid grid-cols-3 gap-2 w-full bg-slate-50/70 dark:bg-slate-900/40 border border-border/50 rounded-xl p-3 text-center">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
                    {t('wac_history_table.quantity')}
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground" dir="ltr">
                    {formatQuantity(item.quantity, locale)}
                  </span>
                </div>

                <div className="flex flex-col gap-1 border-x border-border/40 px-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
                    {t('wac_history_table.unit_cost')}
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-500" dir="ltr">
                    {formatCurrency(item.unit_cost, baseCurrency, locale)}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
                    {t('wac_history_table.new_wac')}
                  </span>
                  <span className="font-mono text-xs font-black text-operational-cyan" dir="ltr">
                    {formatCurrency(item.new_wac, baseCurrency, locale)}
                  </span>
                </div>
              </div>
            </div>
          )}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border-muted/20 rounded-3xl bg-card border border-border shadow-sm/40">
          <p className="text-muted-foreground/50 font-semibold text-body-md uppercase tracking-wider">
            Please select an item to view its cost history timeline.
          </p>
        </div>
      )}
    </div>
  );
}
