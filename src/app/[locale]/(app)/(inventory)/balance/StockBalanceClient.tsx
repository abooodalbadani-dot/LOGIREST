'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { FilterPanel } from '@/components/shared/DataTable/FilterPanel';
import { Input } from '@/components/ui/input';
import { useInventoryBalance } from '@/features/inventory/hooks/useInventoryBalance';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { WarehouseSchema } from '@/types/master-data';
import { generateCSV } from '@/utils/export';
import type { StockBalanceItem } from '@/types/inventory';

interface StockBalanceClientProps {
  locale: string;
  title: string;
}

export default function StockBalanceClient({ locale, title }: StockBalanceClientProps) {
  const t = useTranslations('inventory.balance');
  const tc = useTranslations('common');
  const currentLocale = useLocale();
  const isRtl = currentLocale === 'ar';

  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: warehouses } = useMasterDataList('warehouses', WarehouseSchema);
  const { data, isLoading } = useInventoryBalance({
    warehouse_id: warehouseFilter || undefined,
    search: searchFilter || undefined,
    page,
  });

  const columns = useMemo<ColumnDef<StockBalanceItem, unknown>[]>(() => [
    {
      accessorKey: 'item_code',
      header: t('item_code'),
      cell: ({ getValue }) => <span dir="ltr">{getValue() as string}</span>,
    },
    {
      id: 'item_name',
      header: t('item_name'),
      cell: ({ row }) => isRtl ? row.original.item_name_ar : row.original.item_name_en,
    },
    {
      id: 'warehouse',
      header: t('warehouse'),
      cell: ({ row }) => isRtl ? row.original.warehouse_name_ar : row.original.warehouse_name_en,
    },
    {
      accessorKey: 'qty_on_hand',
      header: t('on_hand'),
      meta: { numeric: true },
      cell: ({ getValue }) => <span dir="ltr">{getValue() as number}</span>,
    },
    {
      accessorKey: 'qty_reserved',
      header: t('reserved'),
      meta: { numeric: true },
      cell: ({ getValue }) => <span dir="ltr">{getValue() as number}</span>,
    },
    {
      accessorKey: 'qty_available',
      header: t('available'),
      meta: { numeric: true },
      cell: ({ row }) => {
        const qty = row.original.qty_available;
        const reorderPoint = row.original.reorder_point;
        const isLow = qty < reorderPoint;
        return (
          <span dir="ltr" className={isLow ? 'text-neon-red font-bold' : ''}>
            {qty}
          </span>
        );
      },
    },
  ], [t, isRtl]);

  const handleExport = () => {
    if (!data?.data) return;
    const headers = [t('item_code'), t('item_name'), t('warehouse'), t('on_hand'), t('reserved'), t('available'), t('reorder_point')];
    const rows = data.data.map(item => [
      item.item_code,
      isRtl ? item.item_name_ar : item.item_name_en,
      isRtl ? item.warehouse_name_ar : item.warehouse_name_en,
      String(item.qty_on_hand),
      String(item.qty_reserved),
      String(item.qty_available),
      String(item.reorder_point),
    ]);
    generateCSV(headers, rows, 'stock-balance');
  };

  const resetFilters = () => {
    setWarehouseFilter('');
    setSearchFilter('');
    setPage(1);
  };

  const rowClassName = (row: StockBalanceItem) => {
    return row.qty_available < row.reorder_point ? 'bg-neon-red/5' : '';
  };

  const pagination = data?.meta ? {
    page: data.meta.page,
    pageSize: data.meta.page_size,
    total: data.meta.total,
    totalPages: data.meta.total_pages,
    onPageChange: setPage,
  } : undefined;

  return (
    <div className="p-6">
      <PageHeader title={title} />

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        pagination={pagination}
        onExport={handleExport}
        rowClassName={rowClassName}
        filters={
          <FilterPanel onReset={resetFilters}>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-on-surface-muted">{t('warehouse')}</label>
              <select
                value={warehouseFilter}
                onChange={e => { setWarehouseFilter(e.target.value); setPage(1); }}
                className="h-10 rounded-md border border-white/5 bg-surface-0 px-3 py-2 text-sm text-on-surface outline-none focus-visible:ring-1 focus-visible:ring-neon-cyan focus-visible:border-neon-cyan"
              >
                <option value="">{tc('status.all')}</option>
                {warehouses?.data?.map((wh: { id: string; name_ar: string; name_en: string }) => (
                  <option key={wh.id} value={wh.id}>
                    {isRtl ? wh.name_ar : wh.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-on-surface-muted">{t('item_code')}</label>
              <Input
                value={searchFilter}
                onChange={e => { setSearchFilter(e.target.value); setPage(1); }}
                placeholder={t('item_code')}
                className="max-w-[200px]"
              />
            </div>
          </FilterPanel>
        }
        emptyState={<div className="text-on-surface-muted">{tc('no_items')}</div>}
      />
    </div>
  );
}
