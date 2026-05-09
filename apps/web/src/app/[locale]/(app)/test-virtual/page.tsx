'use client';

import * as React from 'react';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';

interface MockData {
  id: string;
  name: string;
  sku: string;
  qty: number;
}

export default function TestVirtualPage() {
  const data = React.useMemo(() => {
    return Array.from({ length: 1000 }).map((_, i) => ({
      id: `item-${i}`,
      name: `Inventory Item #${i}`,
      sku: `SKU-00${i}`,
      qty: Math.floor(Math.random() * 1000),
    }));
  }, []);

  const columns: ColumnDef<MockData>[] = [
    {
      accessorKey: 'sku',
      header: 'SKU',
    },
    {
      accessorKey: 'name',
      header: 'Item Name',
    },
    {
      accessorKey: 'qty',
      header: 'Quantity',
      meta: { numeric: true },
    },
  ];

  return (
    <div className="p-10 space-y-10">
      <h1 className="text-2xl font-bold">Virtualization Test (1000 Rows)</h1>
      <div className="border rounded-xl overflow-hidden bg-white">
        <DataTable
          data={data}
          columns={columns}
          enableVirtualization={true}
          containerHeight="500px"
          virtualRowHeight={48}
        />
      </div>

      <h1 className="text-2xl font-bold">Standard Table (No Virtualization)</h1>
      <div className="border rounded-xl overflow-hidden bg-white">
        <DataTable
          data={data.slice(0, 10)}
          columns={columns}
          enableVirtualization={false}
        />
      </div>
    </div>
  );
}
