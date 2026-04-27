'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Input } from '@/components/ui/input';
import { useInventoryBalance } from '@/features/inventory/hooks/useInventoryBalance';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { WarehouseSchema } from '@/types/master-data';
import { generateExcel } from '@/utils/export';
import type { StockBalanceItem } from '@/types/inventory';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, TrendingUp, AlertTriangle } from 'lucide-react';

interface StockBalanceClientProps {
  title: string;
}

export default function StockBalanceClient({ title }: StockBalanceClientProps) {
  const t = useTranslations('inventory.balance');
  const tc = useTranslations('common');
  const currentLocale = useLocale();
  const isRtl = currentLocale === 'ar';

  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: warehouses } = useMasterDataList('warehouses', WarehouseSchema);
  const { data, isLoading } = useInventoryBalance({
    warehouse_id: warehouseFilter && warehouseFilter !== 'all' ? warehouseFilter : undefined,
    search: searchFilter || undefined,
    page,
  });

  const columns = useMemo<ColumnDef<StockBalanceItem, unknown>[]>(() => [
    {
      id: 'status',
      header: tc('status_label'),
      cell: ({ row }) => {
        const qty = row.original.qty_available;
        const reorderPoint = row.original.reorder_point;
        const isLow = qty < reorderPoint;
        if (isLow) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-black bg-rose-500/10 text-rose-400 uppercase tracking-tight">
              {t('low_stock') || 'Critical'}
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-black bg-emerald-500/10 text-emerald-400 uppercase tracking-tight">
            {t('sufficient') || 'Sufficient'}
          </span>
        );
      }
    },
    {
      id: 'item_name',
      header: t('item_name'),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-on-surface leading-tight">
            {isRtl ? row.original.item_name_ar : row.original.item_name_en}
          </span>
          <span className="text-[10px] text-on-surface-muted font-mono tracking-tighter" dir="ltr">
            {row.original.item_code}
          </span>
        </div>
      ),
    },
    {
      id: 'warehouse',
      header: t('warehouse'),
      cell: ({ row }) => (
        <span className="text-xs font-medium text-on-surface-muted">
          {isRtl ? row.original.warehouse_name_ar : row.original.warehouse_name_en}
        </span>
      ),
    },
    {
      accessorKey: 'qty_on_hand',
      header: t('on_hand'),
      cell: ({ getValue }) => <span dir="ltr" className="font-display text-xs text-on-surface/70">{(getValue() as number).toLocaleString()}</span>,
    },
    {
      accessorKey: 'qty_reserved',
      header: t('reserved'),
      cell: ({ getValue }) => <span dir="ltr" className="font-display text-xs text-on-surface-muted/50">{(getValue() as number).toLocaleString()}</span>,
    },
    {
      accessorKey: 'qty_available',
      header: t('available'),
      cell: ({ row }) => {
        const val = row.original.qty_available;
        const isLow = val < row.original.reorder_point;
        return (
          <span dir="ltr" className={`font-display text-sm font-black ${isLow ? 'text-rose-400' : 'text-cyan-500'}`}>
            {val.toLocaleString()}
          </span>
        );
      },
    },
  ], [t, tc, isRtl]);

  const handleExport = () => {
    if (!data?.data) return;
    const exportColumns = [
      { header: t('item_code'), key: 'item_code', width: 15 },
      { header: t('item_name'), key: 'item_name', width: 30 },
      { header: t('warehouse'), key: 'warehouse_name', width: 25 },
      { header: t('on_hand'), key: 'qty_on_hand', width: 12 },
      { header: t('reserved'), key: 'qty_reserved', width: 12 },
      { header: t('available'), key: 'qty_available', width: 12 },
      { header: t('reorder_point'), key: 'reorder_point', width: 15 },
    ];

    const rows = data.data.map(item => ({
      ...item,
      item_name: isRtl ? item.item_name_ar : item.item_name_en,
      warehouse_name: isRtl ? item.warehouse_name_ar : item.warehouse_name_en,
    }));

    generateExcel(exportColumns, rows, 'Stock_Balances');
  };

  const totalItems = data?.meta?.total ?? 0;
  const lowStockItems = data?.data?.filter(i => i.qty_available < i.reorder_point).length ?? 0;
  const sufficientStock = data?.data?.filter(i => i.qty_available >= i.reorder_point).length ?? 0;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10">
      <PageHeader
        title={title}
        description={t('description')}
        actions={
          <div className="flex flex-col items-end gap-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-muted flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                {t('live_updates') || 'Live Inventory Feed'}
             </div>
             <div className="text-[9px] font-bold text-on-surface-muted/40">
                {t('last_sync') || 'Last Sync'}: {new Date().toLocaleTimeString()}
             </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-surface-container-low/60 relative overflow-hidden group shadow-lg border-l-2 border-cyan-500/30 rounded-2xl transition-all hover:bg-surface-container-low/80">
          <div className="absolute bottom-0 left-0 h-1 bg-cyan-500 w-full transform origin-left scale-x-50 group-hover:scale-x-100 transition-transform duration-500" />
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Package className="w-16 h-16 text-cyan-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-on-surface-muted">
              {t('total_skus') || 'Total SKUs'}
            </CardDescription>
            <CardTitle className="text-3xl font-display text-cyan-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]" dir="ltr">
              {totalItems}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-surface-container-low/60 relative overflow-hidden group shadow-lg border-l-2 border-rose-500/30 rounded-2xl transition-all hover:bg-surface-container-low/80">
          <div className="absolute bottom-0 left-0 h-1 bg-rose-500 w-full transform origin-left scale-x-[0.15] group-hover:scale-x-100 transition-transform duration-500" />
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <AlertTriangle className="w-16 h-16 text-rose-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-rose-400/60">
              {t('critical_stock') || 'Critical Stock'}
            </CardDescription>
            <CardTitle className="text-3xl font-display text-rose-500" dir="ltr">
              {lowStockItems}
              <span className="text-xs font-bold text-rose-400/40 ms-2 uppercase tracking-tight">{tc('items')}</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-surface-container-low/60 relative overflow-hidden group shadow-lg border-l-2 border-emerald-500/30 rounded-2xl transition-all hover:bg-surface-container-low/80">
          <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 w-full transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <TrendingUp className="w-16 h-16 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60">
              {t('sufficient_stock') || 'Sufficient Stock'}
            </CardDescription>
            <CardTitle className="text-3xl font-display text-emerald-500" dir="ltr">
              {sufficientStock}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        pagination={{
          page,
          pageSize: data?.meta?.page_size ?? 10,
          total: data?.meta?.total ?? 0,
          totalPages: data?.meta?.total_pages ?? 0,
          onPageChange: setPage,
        }}
        filters={
          <div className="flex flex-wrap items-end gap-6 mb-2 bg-surface-container-low p-6 rounded-2xl shadow-inner border border-white/5">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-on-surface-muted uppercase tracking-widest ps-1">
                {t('warehouse')}
              </span>
              <Select value={warehouseFilter} onValueChange={(v) => { if (v) setWarehouseFilter(v); }}>
                <SelectTrigger className="w-[200px] h-10 bg-surface-container-highest/30 border-none rounded-xl text-xs font-bold focus:ring-cyan-500/30 transition-all">
                  <SelectValue placeholder={t('all_warehouses')} />
                </SelectTrigger>
                <SelectContent className="bg-surface-container-lowest border-cyan-500/20">
                  <SelectItem value="all">{t('all_warehouses')}</SelectItem>
                  {warehouses?.data?.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {isRtl ? w.name_ar : w.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 flex-1 min-w-[300px]">
              <span className="text-[10px] font-black text-on-surface-muted uppercase tracking-widest ps-1">
                {t('search_placeholder')}
              </span>
              <Input
                placeholder={t('search_placeholder')}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="h-10 bg-surface-container-highest/30 border-none rounded-xl text-xs font-bold focus-visible:ring-cyan-500/30 transition-all"
              />
            </div>

            <Button
              onClick={handleExport}
              variant="outline"
              className="h-10 bg-surface-container-highest/50 hover:bg-surface-container-highest border-white/10 rounded-xl text-xs font-black uppercase tracking-widest gap-2 px-6 transition-all shadow-md"
            >
              {tc('export_excel')}
            </Button>
          </div>
        }
      />
    </div>
  );
}
