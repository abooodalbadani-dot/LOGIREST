'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import { formatQuantity, formatCurrency } from '@/utils/currency';

interface ValuationRow {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  itemActive: boolean;
  warehouseName: string;
  qtyOnHand: number;
  unitCost: number;
  totalValue: number;
  lastUpdated: string;
}

interface Props {
  data: ValuationRow[];
  isLoading?: boolean;
  currencySymbol?: string;
}

export function ValuationTable({ data, isLoading, currencySymbol = 'SAR' }: Props) {
  const locale = useLocale() as 'ar' | 'en';

  const columns: ColumnDef<ValuationRow, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'itemSku',
        header: 'SKU',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-label-sm font-semibold">
              {row.original.itemSku}
            </span>
            {!row.original.itemActive && (
              <Badge
                variant="outline"
                className="text-label-xs bg-amber-500/10 text-amber-600 border-amber-500/30 font-semibold uppercase tracking-wider"
              >
                Inactive
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'itemName',
        header: 'Item Name',
        cell: ({ row }) => (
          <span className={!row.original.itemActive ? 'text-muted-foreground/60' : ''}>
            {row.original.itemName}
          </span>
        ),
      },
      {
        accessorKey: 'warehouseName',
        header: 'Warehouse',
      },
      {
        accessorKey: 'qtyOnHand',
        header: 'On Hand',
        cell: ({ row }) => formatQuantity(row.original.qtyOnHand, locale),
      },
      {
        accessorKey: 'unitCost',
        header: `Unit Cost (${currencySymbol})`,
        cell: ({ row }) => formatCurrency(row.original.unitCost, currencySymbol, locale),
      },
      {
        accessorKey: 'totalValue',
        header: `Total Value (${currencySymbol})`,
        cell: ({ row }) => formatCurrency(row.original.totalValue, currencySymbol, locale),
      },
    ],
    [currencySymbol, locale],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      emptyTitle="No valuation data available"
    />
  );
}
