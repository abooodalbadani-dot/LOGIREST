'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Checkbox } from '@/components/ui/checkbox';
import { useInventoryLots } from '@/features/inventory/hooks/useInventoryLots';
import { generateExcel } from '@/utils/export';
import type { InventoryLot } from '@/types/inventory';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layers, AlertCircle, Clock } from 'lucide-react';

interface LotBalanceClientProps {
  title: string;
}

export default function LotBalanceClient({ title }: LotBalanceClientProps) {
  const t = useTranslations('inventory.lots');
  const tc = useTranslations('common');
  const currentLocale = useLocale();
  const isRtl = currentLocale === 'ar';

  const [includeExpired, setIncludeExpired] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useInventoryLots({
    include_expired: includeExpired || undefined,
    page,
  });

  const getLotStatus = useMemo(() => (lot: InventoryLot): { label: string; variant: string } => {
    if (lot.is_expired) return { label: t('expired'), variant: 'bg-black/40 text-rose-400 border-rose-400/20' };
    if (lot.is_near_expiry) return { label: t('near_expiry'), variant: 'bg-black/40 text-amber-400 border-amber-400/20' };
    return { label: t('valid'), variant: 'bg-black/40 text-emerald-400 border-emerald-400/20' };
  }, [t]);

  const columns = useMemo<ColumnDef<InventoryLot, unknown>[]>(() => [
    {
      id: 'status',
      header: tc('status_label'),
      cell: ({ row }) => {
        const status = getLotStatus(row.original);
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-tight border ${status.variant}`}>
            {status.label}
          </span>
        );
      },
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
      accessorKey: 'lot_number',
      header: t('lot_number'),
      cell: ({ getValue }) => <span dir="ltr" className="font-mono text-[11px] text-cyan-500">{getValue() as string}</span>,
    },
    {
      accessorKey: 'expiry_date',
      header: t('expiry_date'),
      cell: ({ getValue }) => {
        const val = getValue() as string | null;
        if (!val) return <span className="text-on-surface-muted/30">—</span>;
        return <span dir="ltr" className="text-xs font-medium">{new Date(val).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}</span>;
      },
    },
    {
      accessorKey: 'qty_available',
      header: t('available_qty'),
      cell: ({ getValue }) => <span dir="ltr" className="font-display text-sm font-black text-on-surface/80">{(getValue() as number).toLocaleString()}</span>,
    },
  ], [t, tc, isRtl, getLotStatus]);

  const handleExport = () => {
    if (!data?.data) return;
    const exportColumns = [
      { header: t('item_code'), key: 'item_code', width: 15 },
      { header: t('item_name'), key: 'item_name', width: 30 },
      { header: t('lot_number'), key: 'lot_number', width: 15 },
      { header: t('expiry_date'), key: 'expiry_date', width: 15 },
      { header: t('available_qty'), key: 'qty_available', width: 15 },
      { header: t('status'), key: 'status_label', width: 15 },
    ];

    const rows = data.data.map(item => ({
      ...item,
      item_name: isRtl ? item.item_name_ar : item.item_name_en,
      status_label: getLotStatus(item).label,
    }));

    generateExcel(exportColumns, rows, 'Lot_Balances');
  };

  const totalLots = data?.meta?.total ?? 0;
  const expiredLots = data?.data?.filter(l => l.is_expired).length ?? 0;
  const nearExpiryLots = data?.data?.filter(l => l.is_near_expiry).length ?? 0;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10">
      <PageHeader
        title={title}
        description={t('description') || 'Track item batches and expiry dates across the system.'}
        actions={
          <div className="flex flex-col items-end gap-1">
             <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-muted flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                {t('live_updates') || 'Live Expiry Monitor'}
             </div>
             <div className="text-[9px] font-bold text-on-surface-muted/40">
                {t('last_sync') || 'Last Sync'}: {new Date().toLocaleTimeString()}
             </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-surface-2/40 border-surface-3 relative overflow-hidden group">
          <div className="absolute bottom-0 left-0 h-1 bg-cyan-500 w-full transform origin-left scale-x-50 group-hover:scale-x-100 transition-transform duration-500" />
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Layers className="w-16 h-16 text-cyan-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-on-surface-muted">
              {t('total_lots') || 'Active Lots'}
            </CardDescription>
            <CardTitle className="text-3xl font-display text-cyan-500 drop-shadow-[0_0_10px_rgba(0,229,255,0.3)]">
              {totalLots}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-surface-2/40 border-surface-3 relative overflow-hidden group">
          <div className="absolute bottom-0 left-0 h-1 bg-rose-500 w-full transform origin-left scale-x-[0.1] group-hover:scale-x-100 transition-transform duration-500" />
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <AlertCircle className="w-16 h-16 text-rose-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-rose-400/60">
              {t('expired') || 'Expired'}
            </CardDescription>
            <CardTitle className="text-3xl font-display text-rose-500">
              {expiredLots}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-surface-2/40 border-surface-3 relative overflow-hidden group">
          <div className="absolute bottom-0 left-0 h-1 bg-amber-500 w-full transform origin-left scale-x-[0.1] group-hover:scale-x-100 transition-transform duration-500" />
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Clock className="w-16 h-16 text-amber-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-amber-400/60">
              {t('near_expiry') || 'Near Expiry'}
            </CardDescription>
            <CardTitle className="text-3xl font-display text-amber-500">
              {nearExpiryLots}
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
          <div className="flex flex-wrap items-center justify-between gap-6 mb-2">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-2/40 border border-surface-3 transition-all hover:border-cyan-500/30">
              <Checkbox
                id="show-expired"
                checked={includeExpired}
                onCheckedChange={(checked) => {
                  setIncludeExpired(checked === true);
                  setPage(1);
                }}
                className="border-surface-3 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
              />
              <label
                htmlFor="show-expired"
                className="text-[10px] font-black text-on-surface-muted uppercase tracking-widest cursor-pointer select-none"
              >
                {t('show_expired') || 'Show Expired Lots'}
              </label>
            </div>

            <Button
              onClick={handleExport}
              variant="outline"
              className="h-10 border-surface-3 bg-surface-2 hover:bg-surface-3 text-xs font-black uppercase tracking-widest gap-2 px-6"
            >
              {tc('export_excel')}
            </Button>
          </div>
        }
      />
    </div>
  );
}
