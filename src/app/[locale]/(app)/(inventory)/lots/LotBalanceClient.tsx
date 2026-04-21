'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Checkbox } from '@/components/ui/checkbox';
import { useInventoryLots } from '@/features/inventory/hooks/useInventoryLots';
import type { InventoryLot } from '@/types/inventory';

interface LotBalanceClientProps {
  locale: string;
  title: string;
}

export default function LotBalanceClient({ locale, title }: LotBalanceClientProps) {
  const t = useTranslations('inventory.lots');
  const currentLocale = useLocale();

  const [includeExpired, setIncludeExpired] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useInventoryLots({
    include_expired: includeExpired || undefined,
    page,
  });

  const getLotStatus = (lot: InventoryLot): { label: string; colorClass: string } => {
    if (lot.is_expired) return { label: t('expired'), colorClass: 'bg-neon-red/20 text-neon-red' };
    if (lot.is_near_expiry) return { label: t('near_expiry'), colorClass: 'bg-neon-amber/20 text-neon-amber' };
    return { label: t('valid'), colorClass: 'bg-neon-green/20 text-neon-green' };
  };

  const columns = useMemo<ColumnDef<InventoryLot, unknown>[]>(() => [
    {
      accessorKey: 'item_code',
      header: t('item_code'),
      cell: ({ getValue }) => <span dir="ltr">{getValue() as string}</span>,
    },
    {
      id: 'item_name',
      header: t('item_name'),
      cell: ({ row }) => currentLocale === 'ar' ? row.original.item_name_ar : row.original.item_name_en,
    },
    {
      accessorKey: 'lot_number',
      header: t('lot_number'),
      cell: ({ getValue }) => <span dir="ltr">{getValue() as string}</span>,
    },
    {
      accessorKey: 'expiry_date',
      header: t('expiry_date'),
      cell: ({ getValue }) => {
        const val = getValue() as string | null;
        if (!val) return <span className="text-on-surface-muted">—</span>;
        return <span dir="ltr">{new Date(val).toLocaleDateString(currentLocale === 'ar' ? 'ar-SA' : 'en-US')}</span>;
      },
    },
    {
      accessorKey: 'qty_available',
      header: t('available_qty'),
      meta: { numeric: true },
      cell: ({ getValue }) => <span dir="ltr">{getValue() as number}</span>,
    },
    {
      id: 'status',
      header: t('status'),
      cell: ({ row }) => {
        const status = getLotStatus(row.original);
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.colorClass}`}>
            {status.label}
          </span>
        );
      },
    },
  ], [t, currentLocale]);

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
        filters={
          <div className="flex items-center gap-2 py-2">
            <Checkbox
              checked={includeExpired}
              onCheckedChange={(checked) => {
                setIncludeExpired(checked === true);
                setPage(1);
              }}
            />
            <label
              className="text-sm text-on-surface cursor-pointer select-none"
              onClick={() => {
                setIncludeExpired(prev => !prev);
                setPage(1);
              }}
            >
              {t('show_expired')}
            </label>
          </div>
        }
        emptyState={<div className="text-on-surface-muted">—</div>}
      />
    </div>
  );
}
