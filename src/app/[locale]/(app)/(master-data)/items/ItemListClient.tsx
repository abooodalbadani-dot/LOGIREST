'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, CheckCircle2, XCircle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { FilterPanel } from '@/components/shared/DataTable/FilterPanel';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { ItemSchema, type Item } from '@/types/master-data';

export function ItemListClient() {
  const tc = useTranslations('masterData.common');
  const ti = useTranslations('masterData.items');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useMasterDataList(
    'items',
    ItemSchema,
    { page: String(page), ...(search ? { search } : {}) },
  );

  const columns: any[] = [
    { accessorKey: 'code', header: tc('code'), cell: (r: Item) => <span dir="ltr" className="font-mono text-sm">{r.code}</span> },
    { accessorKey: 'barcode', header: ti('barcode'), cell: (r: Item) => <span dir="ltr" className="font-mono text-xs text-text-muted">{r.barcode}</span> },
    { accessorKey: 'name_ar', header: tc('name_ar'), cell: (r: Item) => r.name_ar },
    { accessorKey: 'name_en', header: tc('name_en'), cell: (r: Item) => r.name_en },
    { accessorKey: 'primary_uom', header: ti('primary_uom'), cell: (r: Item) => r.primary_uom.code },
    {
      accessorKey: 'track_lots', header: ti('track_lots'),
      cell: (r: Item) => r.track_lots
        ? <CheckCircle2 className="w-4 h-4 text-green-400" />
        : <XCircle className="w-4 h-4 text-text-muted" />,
    },
    {
      accessorKey: 'is_active', header: tc('is_active'),
      cell: (r: Item) => r.is_active
        ? <CheckCircle2 className="w-4 h-4 text-green-400" />
        : <XCircle className="w-4 h-4 text-red-400" />,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-end">
        <FilterPanel onReset={() => { setSearch(''); setPage(1); }}>
          <input
            type="search"
            placeholder={ti('scan_or_type')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-surface-2 border border-surface-3 rounded w-full md:w-72 text-sm"
            dir="ltr"
          />
        </FilterPanel>
        <Link href="items/new" className={buttonVariants({ variant: 'default' })}>
          <Plus className="w-4 h-4 me-2" />{tc('create_new')}
        </Link>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        onRowClick={(r: Item) => router.push(`items/${r.id}`)} />
      {data?.meta && data.meta.total_pages > 1 && (
        <Pagination page={page} totalPages={data.meta.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
